-- Fettle communities (November 2026). Run after family.sql and alerts.sql.
-- Grassroots groups (parish councils, churches, mosques, gurdwaras, sports clubs, local businesses, residents' groups)
-- invite people to do the check and choose to share with them.
--
-- Privacy by design:
--   * A household shares with a community through a random token kept in its own plan. The row has no account id,
--     no address and no postcode: just which essentials the home has, and rough "more at risk" flags.
--   * A name and a way to contact them are stored only if the resident chooses to add them.
--   * Organisers never read rows. They get totals from community_stats(), with small numbers hidden.
--   * Help requests ("we can't afford this", "please knock on my door") go only to that community's organisers.

create table if not exists public.communities (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,39}$'),
  name       text not null check (char_length(name) between 2 and 80),
  kind       text not null check (kind in ('parish','faith','club','business','residents','school','other')),
  area       text check (char_length(area) <= 80),
  info       jsonb not null default '{}'::jsonb check (jsonb_typeof(info) = 'object' and octet_length(info::text) < 8000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.communities enable row level security;

create table if not exists public.community_admins (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text check (char_length(name) <= 60),
  added_at     timestamptz not null default now(),
  primary key (community_id, user_id)
);
alter table public.community_admins enable row level security;

create table if not exists public.community_members (
  token        uuid primary key,
  community_id uuid not null references public.communities(id) on delete cascade,
  data         jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 2000),
  named        text check (char_length(named) <= 60),
  contact      text check (char_length(contact) <= 120),
  updated_at   timestamptz not null default now()
);
create index if not exists community_members_c_idx on public.community_members(community_id);
alter table public.community_members enable row level security;

create table if not exists public.community_requests (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  token        uuid,
  need         text not null check (need in ('costs','knock','other')),
  note         text check (char_length(note) <= 500),
  named        text check (char_length(named) <= 60),
  contact      text check (char_length(contact) <= 120),
  status       text not null default 'new' check (status in ('new','done')),
  created_at   timestamptz not null default now()
);
create index if not exists community_requests_c_idx on public.community_requests(community_id, created_at desc);
alter table public.community_requests enable row level security;
-- No policies on the four tables: everything goes through the functions below.

create or replace function public.is_community_admin(p_community uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_admins where community_id = p_community and user_id = auth.uid());
$$;
revoke all on function public.is_community_admin(uuid) from public, anon;
grant execute on function public.is_community_admin(uuid) to authenticated;

-- What anyone can see about a community: its name and the local information its organisers chose to publish.
create or replace function public.community_public(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', slug, 'name', name, 'kind', kind, 'area', area, 'info', info)
  from public.communities where slug = lower(p_slug);
$$;
grant execute on function public.community_public(text) to anon, authenticated;

-- Start a community. The person who starts it is its first organiser. Up to 5 per person.
create or replace function public.community_create(p_slug text, p_name text, p_kind text, p_area text, p_admin_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.communities;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if (select count(*) from public.community_admins where user_id = auth.uid()) >= 5 then raise exception 'You already look after 5 communities'; end if;
  if lower(p_slug) in ('flood','calc','local','remind','admin','privacy','terms','guides','tr','c','api','join','connect','book','fettle') then
    raise exception 'That web address is taken. Try another'; end if;
  if exists (select 1 from public.communities where slug = lower(p_slug)) then raise exception 'That web address is taken. Try another'; end if;
  insert into public.communities (slug, name, kind, area, created_by) values (lower(p_slug), p_name, p_kind, nullif(p_area, ''), auth.uid()) returning * into c;
  insert into public.community_admins (community_id, user_id, name) values (c.id, auth.uid(), left(coalesce(p_admin_name, ''), 60));
  return jsonb_build_object('slug', c.slug, 'name', c.name, 'kind', c.kind, 'area', c.area, 'info', c.info);
end $$;
revoke all on function public.community_create(text, text, text, text, text) from public, anon;
grant execute on function public.community_create(text, text, text, text, text) to authenticated;

-- Communities I look after.
create or replace function public.community_mine()
returns setof jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', c.slug, 'name', c.name, 'kind', c.kind, 'area', c.area, 'info', c.info)
  from public.communities c join public.community_admins a on a.community_id = c.id where a.user_id = auth.uid() order by c.created_at;
$$;
revoke all on function public.community_mine() from public, anon;
grant execute on function public.community_mine() to authenticated;

-- Organisers update the local information shown to members and printed in their books.
create or replace function public.community_set_info(p_slug text, p_name text, p_area text, p_info jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null or not public.is_community_admin(cid) then raise exception 'Only this community''s organisers can do that'; end if;
  update public.communities set name = coalesce(nullif(p_name, ''), name), area = nullif(p_area, ''), info = p_info where id = cid;
end $$;
revoke all on function public.community_set_info(text, text, text, jsonb) from public, anon;
grant execute on function public.community_set_info(text, text, text, jsonb) to authenticated;

-- ---------- Keeping the totals honest ----------
-- New homes join only through /api/community-join, which runs a robot check (Cloudflare Turnstile) and passes a scrambled,
-- daily-changing code for the internet connection. Up to 20 new homes per connection per community per day, and 150 per
-- community per hour. Homes that have joined update their answers directly: their random token is the key.
alter table public.community_members add column if not exists joined_at timestamptz not null default now();
create index if not exists community_members_j_idx on public.community_members(community_id, joined_at);

create table if not exists public.community_join_log (
  community_id uuid not null references public.communities(id) on delete cascade,
  net          text not null check (char_length(net) <= 64),
  at           timestamptz not null default now()
);
create index if not exists community_join_log_idx on public.community_join_log(community_id, net, at);
alter table public.community_join_log enable row level security;

create table if not exists public.community_flags (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  flagged_by   uuid references auth.users(id) on delete set null,
  since        timestamptz not null,
  joins        int not null,
  note         text check (char_length(note) <= 500),
  status       text not null default 'new' check (status in ('new','removed','kept')),
  created_at   timestamptz not null default now(),
  notified_at  timestamptz
);
alter table public.community_flags enable row level security;
alter table public.community_flags add column if not exists notified_at timestamptz;

create or replace function public.community_join(p_slug text, p_token uuid, p_data jsonb, p_named text, p_contact text, p_net text)
returns text language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null then return 'missing'; end if;
  if exists (select 1 from public.community_members where token = p_token) then
    update public.community_members set community_id = cid, data = p_data, named = nullif(left(p_named, 60), ''),
      contact = nullif(left(p_contact, 120), ''), updated_at = now() where token = p_token;
    return 'ok';
  end if;
  delete from public.community_join_log where at < now() - interval '2 days';
  if (select count(*) from public.community_join_log where community_id = cid and net = p_net and at > now() - interval '1 day') >= 20 then return 'net'; end if;
  if (select count(*) from public.community_members where community_id = cid and joined_at > now() - interval '1 hour') >= 150 then return 'busy'; end if;
  insert into public.community_join_log (community_id, net) values (cid, left(p_net, 64));
  insert into public.community_members (token, community_id, data, named, contact)
    values (p_token, cid, p_data, nullif(left(p_named, 60), ''), nullif(left(p_contact, 120), ''));
  return 'ok';
end $$;
revoke all on function public.community_join(text, uuid, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.community_join(text, uuid, jsonb, text, text, text) to service_role;

-- A home that has already joined updates its answers. Returns false if the token isn't a member (never joined, or removed),
-- and the app then joins again through the robot check.
drop function if exists public.community_share(text, uuid, jsonb, text, text);
create function public.community_share(p_slug text, p_token uuid, p_data jsonb, p_named text, p_contact text)
returns boolean language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null then raise exception 'That community isn''t on Fettle'; end if;
  update public.community_members set community_id = cid, data = p_data, named = nullif(left(p_named, 60), ''),
    contact = nullif(left(p_contact, 120), ''), updated_at = now() where token = p_token;
  return found;
end $$;
grant execute on function public.community_share(text, uuid, jsonb, text, text) to anon, authenticated;

-- How many homes joined when: last hour, last day, last week, and each of the last 14 days. No answers, just counts.
create or replace function public.community_joins(cid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'h1', count(*) filter (where joined_at > now() - interval '1 hour'),
    'd1', count(*) filter (where joined_at > now() - interval '1 day'),
    'd7', count(*) filter (where joined_at > now() - interval '7 days'),
    'days', (select jsonb_agg((select count(*) from public.community_members m where m.community_id = cid and m.joined_at::date = d::date) order by d)
             from generate_series(current_date - 13, current_date, interval '1 day') d),
    'flag', (select status from public.community_flags where community_id = cid order by created_at desc limit 1))
  from public.community_members where community_id = cid;
$$;
revoke all on function public.community_joins(uuid) from public, anon, authenticated;

-- An organiser flags a burst of joins that looks wrong. Fettle reviews it and can remove those homes; real homes are
-- added back next time they use Fettle, through the robot check.
create or replace function public.community_flag(p_slug text, p_hours int, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare cid uuid; s timestamptz; n int;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null or not public.is_community_admin(cid) then raise exception 'Only this community''s organisers can do that'; end if;
  if p_hours not in (1, 24, 168) then raise exception 'Choose a time'; end if;
  if (select count(*) from public.community_flags where community_id = cid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve flagged a few times today. We''ll be in touch'; end if;
  s := now() - make_interval(hours => p_hours);
  select count(*) into n from public.community_members where community_id = cid and joined_at > s;
  insert into public.community_flags (community_id, flagged_by, since, joins, note) values (cid, auth.uid(), s, n, nullif(left(p_note, 500), ''));
  return n;
end $$;
revoke all on function public.community_flag(text, int, text) from public, anon;
grant execute on function public.community_flag(text, int, text) to authenticated;

-- For Fettle, after reviewing a flag: removes the homes that joined in that window (and their help requests).
create or replace function public.community_remove_flagged(p_flag uuid)
returns int language plpgsql security definer set search_path = public as $$
declare f public.community_flags; n int;
begin
  select * into f from public.community_flags where id = p_flag;
  if f.id is null then raise exception 'No such flag'; end if;
  delete from public.community_requests where token in (select token from public.community_members where community_id = f.community_id and joined_at > f.since);
  delete from public.community_members where community_id = f.community_id and joined_at > f.since;
  get diagnostics n = row_count;
  update public.community_flags set status = 'removed' where id = p_flag;
  return n;
end $$;
revoke all on function public.community_remove_flagged(uuid) from public, anon, authenticated;
grant execute on function public.community_remove_flagged(uuid) to service_role;

create or replace function public.community_leave(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.community_requests where token = p_token;
  delete from public.community_members where token = p_token;
$$;
grant execute on function public.community_leave(uuid) to anon, authenticated;

-- Ask the community for help. Up to 5 a day per household.
create or replace function public.community_ask(p_slug text, p_token uuid, p_need text, p_note text, p_named text, p_contact text)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null then raise exception 'That community isn''t on Fettle'; end if;
  if not exists (select 1 from public.community_members where token = p_token and community_id = cid) then
    raise exception 'Add your home to their totals first, then you can ask for help'; end if;
  if (select count(*) from public.community_requests where token = p_token and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You''ve sent a few requests today. They''ll be in touch'; end if;
  insert into public.community_requests (community_id, token, need, note, named, contact)
    values (cid, p_token, p_need, nullif(left(p_note, 500), ''), nullif(left(p_named, 60), ''), nullif(left(p_contact, 120), ''));
end $$;
grant execute on function public.community_ask(text, uuid, text, text, text, text) to anon, authenticated;

-- Totals for organisers. Fewer than 5 homes: just the count. Any number under 3 is shown as "fewer than 3" (null).
create or replace function public.community_stats(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid; n int; res jsonb := '{}'::jsonb; k text; has int; app int;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null or not public.is_community_admin(cid) then raise exception 'Only this community''s organisers can see this'; end if;
  select count(*) into n from public.community_members where community_id = cid;
  if n < 5 then return jsonb_build_object('members', n, 'small', true, 'joins', public.community_joins(cid)); end if;
  for k in select distinct jsonb_object_keys(data->'ind') from public.community_members where community_id = cid and jsonb_typeof(data->'ind') = 'object' loop
    select count(*) filter (where (data->'ind'->>k)::int = 1), count(*) filter (where data->'ind' ? k) into has, app
      from public.community_members where community_id = cid;
    res := res || jsonb_build_object(k, jsonb_build_object('app', app, 'missing', case when app - has between 1 and 2 then null else app - has end));
  end loop;
  return jsonb_build_object('members', n, 'named', (select count(*) from public.community_members where community_id = cid and named is not null),
    'ind', res,
    'risk', (select jsonb_build_object(
        'o70', case when o between 1 and 2 then null else o end,
        'alone', case when al between 1 and 2 then null else al end,
        'u5', case when u between 1 and 2 then null else u end)
      from (select count(*) filter (where (data->'risk'->>'o70')::boolean) o, count(*) filter (where (data->'risk'->>'alone')::boolean) al,
                   count(*) filter (where (data->'risk'->>'u5')::boolean) u
            from public.community_members where community_id = cid) t),
    'requests', (select count(*) from public.community_requests where community_id = cid and status = 'new'),
    'joins', public.community_joins(cid),
    'updated', (select max(updated_at) from public.community_members where community_id = cid));
end $$;
revoke all on function public.community_stats(text) from public, anon;
grant execute on function public.community_stats(text) to authenticated;

-- People who chose to give their name, and help requests: organisers only.
create or replace function public.community_people(p_slug text)
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null or not public.is_community_admin(cid) then raise exception 'Only this community''s organisers can see this'; end if;
  return query select jsonb_build_object('named', named, 'contact', contact, 'updated', updated_at,
      'risk', data->'risk', 'missing', (select coalesce(jsonb_agg(key), '[]'::jsonb) from jsonb_each_text(coalesce(data->'ind', '{}'::jsonb)) where value = '0'))
    from public.community_members where community_id = cid and named is not null order by named;
end $$;
revoke all on function public.community_people(text) from public, anon;
grant execute on function public.community_people(text) to authenticated;

create or replace function public.community_requests_list(p_slug text)
returns setof jsonb language plpgsql stable security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from public.communities where slug = lower(p_slug);
  if cid is null or not public.is_community_admin(cid) then raise exception 'Only this community''s organisers can see this'; end if;
  return query select jsonb_build_object('id', id, 'need', need, 'note', note, 'named', named, 'contact', contact, 'status', status, 'at', created_at)
    from public.community_requests where community_id = cid order by status, created_at desc limit 200;
end $$;
revoke all on function public.community_requests_list(text) from public, anon;
grant execute on function public.community_requests_list(text) to authenticated;

create or replace function public.community_request_done(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.community_requests r set status = 'done'
    where r.id = p_id and public.is_community_admin(r.community_id);
end $$;
revoke all on function public.community_request_done(uuid) from public, anon;
grant execute on function public.community_request_done(uuid) to authenticated;

-- Anonymous counts for joining and newsletters.
alter table public.fettle_events drop constraint if exists fettle_events_kind_check;
alter table public.fettle_events add constraint fettle_events_kind_check
  check (kind in ('check_started','check_finished','tool_calc','tool_local','tool_local_found','tool_remind','remind_signup',
                  'tool_flood','tool_flood_found','reg_join','checkin_fine','checkin_maybe','checkin_now',
                  'family_circle','family_checkin',
                  'connect_open','connect_yes','connect_maybe','connect_no','connect_landing','connect_book','connect_emergency','connect_recover',
                  'alerts_on','community_start','community_join','community_ask','community_newsletter'));
