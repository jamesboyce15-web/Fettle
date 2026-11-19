-- Fettle family calls: booking requests, the coordinator's clients, messages from families and the watch list.
-- Only coordinators (rows in public.coordinators) can read or change any of it. Families see their own plan only through
-- its secret link (family_plan), and can only send a message through it (family_message). New requests arrive only
-- through /api/book-call (robot check, then limits per internet connection), which calls book_call as the service role.

create table if not exists public.coordinators (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  phone       text check (char_length(phone) <= 30),
  email       text check (char_length(email) <= 120),   -- the contact families see, not necessarily the sign-in address
  patch       text check (char_length(patch) <= 120),
  role        text not null default 'coordinator' check (role in ('coordinator','admin')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.coordinators enable row level security;

create or replace function public.is_coordinator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.coordinators where user_id = auth.uid() and active);
$$;
revoke all on function public.is_coordinator() from public, anon;
grant execute on function public.is_coordinator() to authenticated;

drop policy if exists "coordinators read" on public.coordinators;
create policy "coordinators read" on public.coordinators for select to authenticated using (public.is_coordinator());
drop policy if exists "coordinators edit own" on public.coordinators;
create policy "coordinators edit own" on public.coordinators for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and role = (select c.role from public.coordinators c where c.user_id = auth.uid()));

create table if not exists public.call_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null default 'new' check (status in ('new','contacted','scheduled','done','declined')),
  booker_name     text not null check (char_length(booker_name) between 1 and 80),
  booker_email    text not null check (char_length(booker_email) between 3 and 120),
  booker_phone    text check (char_length(booker_phone) <= 30),
  relation        text check (char_length(relation) <= 40),
  for_name        text check (char_length(for_name) <= 60),
  for_age         text check (char_length(for_age) <= 20),
  for_district    text check (char_length(for_district) <= 8),
  lives_alone     boolean,
  carers          boolean,
  joining         text check (char_length(joining) <= 300),
  times           text[] check (coalesce(array_length(times, 1), 0) <= 6),
  notes           text check (char_length(notes) <= 1000),
  source          text check (char_length(source) <= 60),
  coordinator_id  uuid references public.coordinators(user_id) on delete set null,
  scheduled_at    timestamptz,
  coord_notes     text check (char_length(coord_notes) <= 2000),
  client_id       uuid,
  net             text check (char_length(net) <= 64)   -- scrambled, daily-changing connection code; cleared after 2 days
);
alter table public.call_requests enable row level security;
create index if not exists call_requests_status_idx on public.call_requests(status, created_at desc);

create table if not exists public.call_clients (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid references public.call_requests(id) on delete set null,
  coordinator_id  uuid references public.coordinators(user_id) on delete set null,
  family_name     text not null check (char_length(family_name) between 1 and 80),
  status          text not null default 'call' check (status in ('call','plan_sent','active','paused','closed')),
  data            jsonb not null default '{}'::jsonb check (pg_column_size(data) < 200000),
  private         jsonb not null default '{}'::jsonb check (pg_column_size(private) < 100000),  -- coordinator only, never shown to the family
  share_token     uuid not null default gen_random_uuid() unique,
  sent_at         timestamptz,
  next_review     date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.call_clients enable row level security;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'call_requests_client_fk') then
    alter table public.call_requests add constraint call_requests_client_fk foreign key (client_id) references public.call_clients(id) on delete set null;
  end if;
end $$;

create or replace function public.call_clients_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists call_clients_touch on public.call_clients;
create trigger call_clients_touch before update on public.call_clients for each row execute function public.call_clients_touch();

create table if not exists public.call_messages (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.call_clients(id) on delete cascade,
  at         timestamptz not null default now(),
  kind       text not null check (kind in ('family','note','system')),
  body       text not null check (char_length(body) between 1 and 2000),
  author     text check (char_length(author) <= 60),
  seen       boolean not null default false
);
alter table public.call_messages enable row level security;
create index if not exists call_messages_client_idx on public.call_messages(client_id, at desc);

create table if not exists public.watch_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.coordinators(user_id) on delete set null,
  title       text not null check (char_length(title) between 1 and 140),
  kind        text not null default 'weather' check (kind in ('weather','flood','power','water','health','cyber','scam','funding','resource','other')),
  band        text not null default 'a' check (band in ('g','a','r')),
  districts   text[] not null default '{}' check (coalesce(array_length(districts, 1), 0) <= 200),
  source      text check (char_length(source) <= 300),
  starts      date,
  ends        date,
  note        text check (char_length(note) <= 1000),
  contacted   jsonb not null default '{}'::jsonb,
  closed      boolean not null default false
);
alter table public.watch_events enable row level security;

do $$ declare t text; begin
  foreach t in array array['call_requests','call_clients','call_messages','watch_events'] loop
    execute format('drop policy if exists "coordinators all" on public.%I', t);
    execute format('create policy "coordinators all" on public.%I for all to authenticated using (public.is_coordinator()) with check (public.is_coordinator())', t);
  end loop;
end $$;

-- A new booking, from /api/book-call only. Up to 5 per internet connection a day, and 60 an hour in all.
create or replace function public.book_call(p jsonb, p_net text)
returns text language plpgsql security definer set search_path = public as $$
declare em text := lower(trim(coalesce(p->>'booker_email', '')));
begin
  update public.call_requests set net = null where net is not null and created_at < now() - interval '2 days';
  if char_length(trim(coalesce(p->>'booker_name', ''))) < 1 or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'bad'; end if;
  if (select count(*) from public.call_requests where net = p_net and created_at > now() - interval '1 day') >= 5 then return 'net'; end if;
  if (select count(*) from public.call_requests where created_at > now() - interval '1 hour') >= 60 then return 'busy'; end if;
  insert into public.call_requests (booker_name, booker_email, booker_phone, relation, for_name, for_age, for_district, lives_alone, carers, joining, times, notes, source, net)
  values (left(trim(p->>'booker_name'), 80), left(em, 120), nullif(left(trim(coalesce(p->>'booker_phone', '')), 30), ''),
          nullif(left(p->>'relation', 40), ''), nullif(left(trim(coalesce(p->>'for_name', '')), 60), ''), nullif(left(p->>'for_age', 20), ''),
          nullif(upper(left(regexp_replace(coalesce(p->>'for_district', ''), '[^A-Za-z0-9]', '', 'g'), 4)), ''),
          (p->>'lives_alone')::boolean, (p->>'carers')::boolean, nullif(left(p->>'joining', 300), ''),
          (select array_agg(left(x, 30)) from (select jsonb_array_elements_text(case when jsonb_typeof(p->'times') = 'array' then p->'times' else '[]'::jsonb end) x limit 6) t),
          nullif(left(p->>'notes', 1000), ''), nullif(left(p->>'source', 60), ''), left(p_net, 64));
  return 'ok';
end $$;
revoke all on function public.book_call(jsonb, text) from public, anon, authenticated;
grant execute on function public.book_call(jsonb, text) to service_role;

-- The family's plan, by its secret link. Leaves out the coordinator's private notes.
create or replace function public.family_plan(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('family_name', c.family_name, 'status', c.status, 'sent_at', c.sent_at, 'next_review', c.next_review,
    'updated_at', c.updated_at, 'data', c.data,
    'coordinator', (select jsonb_build_object('name', k.name, 'phone', k.phone, 'email', k.email) from public.coordinators k where k.user_id = c.coordinator_id))
  from public.call_clients c where c.share_token = p_token and c.status <> 'closed';
$$;
grant execute on function public.family_plan(uuid) to anon, authenticated;

-- "Something's changed": a message from the family to their coordinator. Up to 5 a day for each plan.
create or replace function public.family_message(p_token uuid, p_body text, p_author text)
returns boolean language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.call_clients where share_token = p_token and status <> 'closed';
  if cid is null then return false; end if;
  if char_length(trim(coalesce(p_body, ''))) < 1 then raise exception 'Please write a message'; end if;
  if (select count(*) from public.call_messages where client_id = cid and kind = 'family' and at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve sent a few messages today. Your coordinator will be in touch'; end if;
  insert into public.call_messages (client_id, kind, body, author) values (cid, 'family', left(trim(p_body), 2000), nullif(left(trim(coalesce(p_author, '')), 60), ''));
  return true;
end $$;
grant execute on function public.family_message(uuid, text, text) to anon, authenticated;

-- James is the first coordinator, and an admin. The contact families see is the Fettle address, not his own.
insert into public.coordinators (user_id, name, email, role)
select id, coalesce(nullif(raw_user_meta_data->>'first_name', ''), 'James'), 'hello@getfettle.co.uk', 'admin'
from auth.users where lower(email) = 'jamesboyce15@gmail.com'
on conflict (user_id) do nothing;
