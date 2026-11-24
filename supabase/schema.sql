-- Patch: local benchmarking for independent cafés.
-- Only admins (rows in public.admins) can read or change data. The public can: read an area's published page (a snapshot an
-- admin reviewed, never raw per-café visit scores), ask for a report, open their own report by its secret link, and say they'd
-- like a founding place. Nothing about a named café's visit scores is ever public.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name    text not null check (char_length(name) between 1 and 60)
);
alter table public.admins enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.areas (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name          text not null check (char_length(name) between 1 and 80),
  districts     text[] not null default '{}',
  sector        text not null default 'cafe' check (sector in ('cafe','salon')),   -- what's compared: a café basket or salon services
  bench         jsonb not null default '{}'::jsonb,   -- cost per serving estimates, by item
  calendar      jsonb not null default '[]'::jsonb,   -- local events, holidays, roadworks
  costs         jsonb not null default '[]'::jsonb,   -- cost changes: milk, beans, cups
  profile       jsonb,                                 -- who lives and works here (Census)
  geo           jsonb,                                 -- the last AI-answer check: questions, assistants, cafés named
  rankings      jsonb,                                 -- per café, published: rank on visits and nearby search scores (no names)
  supply_bench  jsonb,                                 -- typical supplier prices per litre, kg or cup
  published     jsonb,                                 -- the area page as last published
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.areas enable row level security;

create table if not exists public.venues (
  id             uuid primary key default gen_random_uuid(),
  area_id        uuid not null references public.areas(id) on delete cascade,
  fsa_id         bigint,
  name           text not null check (char_length(name) between 1 and 120),
  address        text check (char_length(address) <= 200),
  postcode       text check (char_length(postcode) <= 10),
  lat            double precision,
  lng            double precision,
  kind           text not null default 'independent' check (kind in ('independent','chain')),
  category       text check (char_length(category) <= 30),   -- salons: hair, barber, nails, beauty, aesthetics
  included       boolean not null default true,
  hygiene        text check (char_length(hygiene) <= 30),
  hygiene_date   date,
  hours          jsonb,
  google_rating  numeric(2,1) check (google_rating between 1 and 5),
  website        text check (char_length(website) <= 300),
  google_url     text check (char_length(google_url) <= 500),
  google_reviews integer check (google_reviews >= 0),
  seo            jsonb,          -- search checks: {at, checks:{...}}
  notes          text check (char_length(notes) <= 1000),
  created_at     timestamptz not null default now(),
  unique (area_id, fsa_id)
);
alter table public.venues enable row level security;

create table if not exists public.observations (
  id          uuid primary key default gen_random_uuid(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  at          date not null default current_date,
  source      text not null check (source in ('menu','visit','website','owner','delivery','platform')),
  prices      jsonb not null default '{}'::jsonb,
  scores      jsonb not null default '{}'::jsonb,
  notes       text check (char_length(notes) <= 1000),
  by_name     text check (char_length(by_name) <= 60),
  photos      jsonb not null default '[]'::jsonb,   -- [{path, tag}] in the private visit-photos bucket
  created_at  timestamptz not null default now()
);
alter table public.observations enable row level security;
create index if not exists observations_venue_idx on public.observations(venue_id, at desc);

create table if not exists public.requests (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  area_id            uuid references public.areas(id) on delete set null,
  venue_id           uuid references public.venues(id) on delete set null,
  venue_text         text check (char_length(venue_text) <= 120),
  name               text not null check (char_length(name) between 1 and 80),
  email              text not null check (char_length(email) between 3 and 120),
  role               text check (char_length(role) <= 40),
  phone              text check (char_length(phone) <= 30),
  message            text check (char_length(message) <= 1000),
  status             text not null default 'new' check (status in ('new','report_sent','founding','not_now')),
  token              uuid not null default gen_random_uuid() unique,
  report             jsonb,
  report_at          timestamptz,
  founding_interest  boolean not null default false,
  founding_message   text check (char_length(founding_message) <= 1000),
  sales              jsonb,      -- only if the owner chose to share: totals by weekday and hour, never single sales
  sales_at           timestamptz,
  owner_state        jsonb,      -- the owner's Patch home: sales totals, price changes, reviews, prep, reminders
  owner_at           timestamptz,
  briefing_off       boolean not null default false,   -- the owner stopped the Monday email
  last_briefing_at   timestamptz,
  admin_notes        text check (char_length(admin_notes) <= 2000)
);
alter table public.requests enable row level security;
-- For databases made before these existed (the functions below need them).
alter table public.requests add column if not exists briefing_off boolean not null default false;
alter table public.requests add column if not exists last_briefing_at timestamptz;


-- Price sweeps: a list of cafés someone (often a paid student) photographs the menu boards of, from a private link.
create table if not exists public.sweeps (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid not null references public.areas(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  sweeper     text check (char_length(sweeper) <= 60),
  rate        numeric(6,2) not null default 5 check (rate >= 0 and rate <= 100),
  due         date,
  token       uuid not null default gen_random_uuid() unique,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now()
);
alter table public.sweeps enable row level security;
create table if not exists public.sweep_items (
  id              uuid primary key default gen_random_uuid(),
  sweep_id        uuid not null references public.sweeps(id) on delete cascade,
  venue_id        uuid not null references public.venues(id) on delete cascade,
  status          text not null default 'todo' check (status in ('todo','sent','approved','retake','skipped')),
  photo_path      text check (char_length(photo_path) <= 200),
  taken_at        timestamptz,
  read            jsonb,                 -- what Claude read off the board: {prices, seen, notes}
  note            text check (char_length(note) <= 300),   -- to the sweeper: why a retake, or why skipped
  approved_at     timestamptz,
  observation_id  uuid references public.observations(id) on delete set null,
  unique (sweep_id, venue_id)
);
alter table public.sweep_items enable row level security;
create index if not exists sweep_items_sweep_idx on public.sweep_items(sweep_id);
create index if not exists sweep_items_venue_idx on public.sweep_items(venue_id);
create index if not exists sweep_items_obs_idx on public.sweep_items(observation_id);
create index if not exists sweeps_area_idx on public.sweeps(area_id);
create index if not exists requests_venue_idx on public.requests(venue_id);
create index if not exists requests_area_idx on public.requests(area_id);
create index if not exists venues_area_idx on public.venues(area_id);

-- Every email Patch writes, sent or not (dry run). Admins can read it; only the server writes it.
create table if not exists public.email_log (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  to_email     text not null,
  kind         text not null check (kind in ('report','weekly','digest')),
  subject      text,
  status       text not null check (status in ('dry-run','sent','failed')),
  request_id   uuid references public.requests(id) on delete set null,
  provider_id  text,
  error        text,
  body_text    text
);
alter table public.email_log enable row level security;
create index if not exists email_log_at_idx on public.email_log(at desc);
create index if not exists email_log_request_idx on public.email_log(request_id);

-- A daily allowance for things that cost money, such as reading photos. Only the server (service role) can use it.
create table if not exists public.ai_usage (day date not null default current_date, who text not null, n integer not null default 0, primary key (day, who));
alter table public.ai_usage enable row level security;
create or replace function public.bump_usage(p_who text, p_max integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare k integer;
begin
  insert into public.ai_usage (day, who, n) values (current_date, left(p_who, 80), 1)
  on conflict (day, who) do update set n = public.ai_usage.n + 1 returning n into k;
  return k <= p_max;
end $$;
revoke all on function public.bump_usage(text, integer) from public, anon, authenticated;
grant execute on function public.bump_usage(text, integer) to service_role;

do $$ declare t text; begin
  foreach t in array array['admins','areas','venues','observations','requests','email_log','sweeps','sweep_items'] loop
    execute format('drop policy if exists "admins all" on public.%I', t);
    execute format('create policy "admins all" on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- The public area page: the published snapshot, and the list of cafés to pick yours from (names and postcodes only).
create or replace function public.area_public(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('slug', a.slug, 'name', a.name, 'sector', a.sector, 'districts', a.districts, 'published', a.published, 'published_at', a.published_at,
    'venues', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'postcode', v.postcode, 'kind', v.kind, 'category', v.category, 'hygiene', v.hygiene) order by v.name)
                        from public.venues v where v.area_id = a.id and v.included), '[]'::jsonb))
  from public.areas a where a.slug = lower(p_slug);
$$;
grant execute on function public.area_public(text) to anon, authenticated;

-- An owner asks for their free report. Up to 3 a day per email address, 100 an hour in all.
create or replace function public.request_report(p_slug text, p_venue uuid, p_venue_text text, p_name text, p_email text, p_role text, p_phone text, p_message text)
returns text language plpgsql security definer set search_path = public as $$
declare aid uuid; em text := lower(trim(coalesce(p_email, '')));
begin
  select id into aid from public.areas where slug = lower(p_slug);
  if aid is null then return 'area'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'bad'; end if;
  if p_venue is not null and not exists (select 1 from public.venues where id = p_venue and area_id = aid) then p_venue := null; end if;
  if (select count(*) from public.requests where email = em and created_at > now() - interval '1 day') >= 3 then return 'many'; end if;
  if (select count(*) from public.requests where created_at > now() - interval '1 hour') >= 100 then return 'busy'; end if;
  insert into public.requests (area_id, venue_id, venue_text, name, email, role, phone, message)
  values (aid, p_venue, nullif(left(trim(coalesce(p_venue_text, '')), 120), ''), left(trim(p_name), 80), left(em, 120),
          nullif(left(p_role, 40), ''), nullif(left(trim(coalesce(p_phone, '')), 30), ''), nullif(left(p_message, 1000), ''));
  return 'ok';
end $$;
grant execute on function public.request_report(text, uuid, text, text, text, text, text, text) to anon, authenticated;

-- An owner opens their report by its secret link.
create or replace function public.report_public(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('report', r.report, 'report_at', r.report_at, 'name', r.name, 'founding', r.founding_interest)
  from public.requests r where r.token = p_token and r.report is not null;
$$;
grant execute on function public.report_public(uuid) to anon, authenticated;

-- "I'd like a founding place." Nothing is charged: an admin gets in touch.
create or replace function public.founding_interest(p_token uuid, p_message text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.requests set founding_interest = true, founding_message = nullif(left(trim(coalesce(p_message, '')), 1000), '')
  where token = p_token and report is not null;
  return found;
end $$;
grant execute on function public.founding_interest(uuid, text) to anon, authenticated;

-- An owner chooses to share their sales pattern (totals by weekday and hour only). Replaces what they shared before.
create or replace function public.share_sales(p_token uuid, p_sales jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_sales) > 20000 or jsonb_typeof(p_sales) <> 'object' then return false; end if;
  update public.requests set sales = p_sales, sales_at = now() where token = p_token and report is not null;
  return found;
end $$;
grant execute on function public.share_sales(uuid, jsonb) to anon, authenticated;

-- The owner's home (owner.html). For the test version the secret link is the key; owner sign-in comes later.
create or replace function public.owner_get(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', r.name, 'state', r.owner_state, 'report', r.report, 'emailOn', not r.briefing_off,
    'venue', (select jsonb_build_object('name', v.name, 'address', v.address, 'lat', v.lat, 'lng', v.lng, 'postcode', v.postcode, 'hygiene', v.hygiene, 'hygieneDate', v.hygiene_date) from public.venues v where v.id = r.venue_id),
    'area', (select jsonb_build_object('name', a.name, 'sector', a.sector, 'calendar', a.calendar, 'costs', a.costs, 'supplyBench', a.supply_bench) from public.areas a where a.id = r.area_id),
    'geo', (select a.geo from public.areas a where a.id = r.area_id),
    'rank', (select a.rankings -> (r.venue_id::text) from public.areas a where a.id = r.area_id),
    'seo', (select v.seo from public.venues v where v.id = r.venue_id),
    'newNearby', coalesce((select jsonb_agg(jsonb_build_object('name', n.name, 'd', round(d::numeric, 1)) order by d) from (
        select n.name, 3958.8 * 2 * asin(sqrt(power(sin(radians(n.lat - me.lat) / 2), 2) + cos(radians(me.lat)) * cos(radians(n.lat)) * power(sin(radians(n.lng - me.lng) / 2), 2))) as d
        from public.venues n, public.venues me where me.id = r.venue_id and n.area_id = r.area_id and n.id <> me.id and n.hygiene = 'AwaitingInspection' and n.lat is not null and me.lat is not null) n where d <= 1), '[]'::jsonb))
  from public.requests r where r.token = p_token and r.venue_id is not null and r.status <> 'not_now';
$$;
grant execute on function public.owner_get(uuid) to anon, authenticated;

create or replace function public.owner_put(p_token uuid, p_state jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(p_state) <> 'object' or pg_column_size(p_state) > 600000 then raise exception 'That is too much to save at once'; end if;
  update public.requests set owner_state = p_state, owner_at = now() where token = p_token and venue_id is not null and status <> 'not_now';
  return found;
end $$;
grant execute on function public.owner_put(uuid, jsonb) to anon, authenticated;

-- For databases made before these columns existed.
alter table public.venues add column if not exists google_url text check (char_length(google_url) <= 500);
alter table public.venues add column if not exists google_reviews integer check (google_reviews >= 0);
alter table public.observations add column if not exists photos jsonb not null default '[]'::jsonb;
-- Salons (Nov 2026): an area's sector, a venue's category, and prices read from booking-platform pages.
alter table public.areas add column if not exists sector text not null default 'cafe' check (sector in ('cafe','salon'));
alter table public.venues add column if not exists category text check (char_length(category) <= 30);
alter table public.observations drop constraint if exists observations_source_check;
alter table public.observations add constraint observations_source_check check (source in ('menu','visit','website','owner','delivery','platform'));
alter table public.observations drop constraint if exists observations_source_check;
alter table public.observations add constraint observations_source_check check (source in ('menu','visit','website','owner','delivery'));

-- Owners' renewals and certificates: a private bucket. Only the server writes or reads it (functions/api/owner-doc.js),
-- after checking the owner's secret link, so there are no public policies on it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('owner-docs', 'owner-docs', false, 8388608, array['application/pdf','image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- Sweep photos: private. The server writes them (functions/api/sweep-photo.js); admins can read them to check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sweep-photos', 'sweep-photos', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "admins read sweep photos" on storage.objects;
create policy "admins read sweep photos" on storage.objects for select to authenticated using (bucket_id = 'sweep-photos' and (select public.is_admin()));

-- Visit photos: a private bucket only admins can read or add to. Owners never see another café's photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "admins read visit photos" on storage.objects;
create policy "admins read visit photos" on storage.objects for select to authenticated using (bucket_id = 'visit-photos' and (select public.is_admin()));
drop policy if exists "admins add visit photos" on storage.objects;
create policy "admins add visit photos" on storage.objects for insert to authenticated with check (bucket_id = 'visit-photos' and (select public.is_admin()));
drop policy if exists "admins remove visit photos" on storage.objects;
create policy "admins remove visit photos" on storage.objects for delete to authenticated using (bucket_id = 'visit-photos' and (select public.is_admin()));

-- The sweeper's list, from their private link: cafés, where they are, and what's done. No prices, no other data.
create or replace function public.sweep_get(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', s.name, 'sweeper', s.sweeper, 'rate', s.rate, 'due', s.due, 'status', s.status, 'area', a.name, 'sector', a.sector,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', v.name, 'address', v.address, 'postcode', v.postcode, 'lat', v.lat, 'lng', v.lng,
        'status', i.status, 'note', i.note, 'taken_at', i.taken_at, 'found', coalesce(jsonb_array_length(jsonb_path_query_array(i.read, '$.prices.keyvalue()')), 0)) order by v.postcode, v.name)
      from public.sweep_items i join public.venues v on v.id = i.venue_id where i.sweep_id = s.id), '[]'::jsonb))
  from public.sweeps s join public.areas a on a.id = s.area_id where s.token = p_token;
$$;
grant execute on function public.sweep_get(uuid) to anon, authenticated;
-- The sweeper can't get a photo: closed, no menu board, or not there any more.
create or replace function public.sweep_skip(p_token uuid, p_item uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.sweep_items i set status = 'skipped', note = left(trim(coalesce(p_reason, '')), 300)
  from public.sweeps s where s.id = i.sweep_id and s.token = p_token and s.status = 'open' and i.id = p_item and i.status in ('todo','retake');
  return found;
end $$;
grant execute on function public.sweep_skip(uuid, uuid, text) to anon, authenticated;

-- The owner turns the Monday email on or off (from their settings, or the unsubscribe link).
create or replace function public.owner_email_pref(p_token uuid, p_on boolean)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.requests set briefing_off = not coalesce(p_on, true) where token = p_token and venue_id is not null;
  return found;
end $$;
grant execute on function public.owner_email_pref(uuid, boolean) to anon, authenticated;

insert into public.areas (slug, name, districts) values ('didsbury-chorlton-withington', 'Didsbury, Chorlton and Withington', '{M20,M21}')
on conflict (slug) do nothing;
