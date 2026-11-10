-- Fettle database. Run once in Supabase: SQL Editor > New query > paste > Run.
-- Choose the London region (eu-west-2) when creating the project.

create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        jsonb not null,                -- the plan answers (includes optional health answers)
  lang        text not null default 'en',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists households_user_idx on public.households(user_id);

alter table public.households enable row level security;
create policy "read own plans"   on public.households for select using (auth.uid() = user_id);
create policy "add own plans"    on public.households for insert with check (auth.uid() = user_id);
create policy "change own plans" on public.households for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own plans" on public.households for delete using (auth.uid() = user_id);

-- Purchases are written only by the Stripe webhook (service role). Users can read their own.
create table if not exists public.purchases (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete set null,
  household_id       uuid references public.households(id) on delete set null,
  product            text not null,            -- 'book_digital' for now
  stripe_session_id  text not null unique,
  amount_total       integer,                  -- in pence
  currency           text,
  livemode           boolean not null default false,
  created_at         timestamptz not null default now()
);
create index if not exists purchases_household_idx on public.purchases(household_id);

alter table public.purchases enable row level security;
create policy "read own purchases" on public.purchases for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role key (server-side) can write.

-- =====================================================================
-- Impact measurement and check-in reminders (added November 2026)
-- Each household's data.scores is a list of check snapshots:
--   {d: ISO date, s: readiness %, m: {water3:1, radio:0, co:null, ...}, note}
-- =====================================================================

-- Which reminder emails have been sent, so nobody gets the same one twice.
create table if not exists public.reminders_sent (
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (household_id, kind)
);
alter table public.reminders_sent enable row level security; -- no policies: server only

-- Households due a 30-day, 90-day or seasonal check, for users who opted in to reminders.
create or replace function public.fettle_recheck_due()
returns table (household_id uuid, user_id uuid, email text, first_name text, household_name text,
               kind text, first_score int, last_score int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.id, hh.user_id, hh.data,
           jsonb_array_length(hh.data->'scores') as n,
           (hh.data->'scores'->0->>'d')::timestamptz as first_at,
           (hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->>'d')::timestamptz as last_at
    from public.households hh
    where jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
  ), k as (
    select h.*, case
      when h.n = 1 and h.first_at <= now() - interval '30 days' then 'day30'
      when h.n = 2 and h.first_at <= now() - interval '90 days' then 'day90'
      when h.n >= 3 and h.last_at <= now() - interval '90 days'
        then 'season-' || to_char(now(), 'YYYY-"Q"Q')
    end as kind
    from h
  )
  select k.id, k.user_id, u.email::text, u.raw_user_meta_data->>'first_name', k.data->>'name', k.kind,
         (k.data->'scores'->0->>'s')::int, (k.data->'scores'->(k.n-1)->>'s')::int
  from k join auth.users u on u.id = k.user_id
  where k.kind is not null
    and coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)
    and not exists (select 1 from public.reminders_sent r where r.household_id = k.id and r.kind = k.kind)
  limit 500;
$$;
revoke all on function public.fettle_recheck_due() from public, anon, authenticated;
grant execute on function public.fettle_recheck_due() to service_role;

-- Anonymous before-and-after totals for one area, for council reports.
-- Counts only households that ticked "Help your council plan" (data.countMe) and have 2 or more checks.
-- Any measure with fewer than 5 households is returned without percentages.
create or replace function public.fettle_impact(p_area text)
returns table (measure text, households int, first_pct int, latest_pct int)
language sql security definer set search_path = public as $$
  with f as (
    select hh.data->'scores'->0->'m' as m0,
           hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->'m' as m1
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 1
  ), x as (
    select key as measure, (f.m0->>key)::int as a, (f.m1->>key)::int as b
    from f, jsonb_object_keys(f.m0) as key
    where f.m0->>key is not null and f.m1->>key is not null
  )
  select measure, count(*)::int,
         case when count(*) >= 5 then round(100.0 * sum(a) / count(*))::int end,
         case when count(*) >= 5 then round(100.0 * sum(b) / count(*))::int end
  from x group by measure order by measure;
$$;
revoke all on function public.fettle_impact(text) from public, anon, authenticated;
grant execute on function public.fettle_impact(text) to service_role;

-- Outcome counts for one area (households that ticked "Help your council plan").
-- Critical risks found at the first check, how many were gone by the latest check, and how many a worker verified.
-- Returns nothing if fewer than 5 households.
create or replace function public.fettle_outcomes(p_area text)
returns table (households int, critical_found int, critical_sorted int, critical_verified int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.data->'scores'->0->'c' as c0,
           hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->'c' as c1,
           coalesce(hh.data->'verified', '{}'::jsonb) as v
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
      and jsonb_typeof(hh.data->'scores'->0->'c') = 'array'
  ), x as (
    select h.v, r.id, not (h.c1 ? r.id) as sorted
    from h, jsonb_array_elements_text(h.c0) as r(id)
  )
  select (select count(*) from h)::int,
         (select count(*) from x)::int,
         (select count(*) from x where sorted)::int,
         (select count(*) from x where sorted and x.v ? x.id)::int
  where (select count(*) from h) >= 5;
$$;
revoke all on function public.fettle_outcomes(text) from public, anon, authenticated;
grant execute on function public.fettle_outcomes(text) to service_role;

-- What's getting in the way: the latest reason households gave for each step they hadn't done,
-- and how many of those steps they went on to do. Rows with fewer than 5 households are left out.
-- Usage: select * from fettle_barriers('Rochdale');
create or replace function public.fettle_barriers(p_area text)
returns table (reason text, households int, steps int, sorted_since int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.id, hh.data
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'commit') = 'object'
  ), x as (
    select h.id, c.key as step, c.value->>'reason' as reason,
           coalesce((h.data->'bought'->>c.key)::boolean, false) as sorted
    from h, jsonb_each(h.data->'commit') as c
    where jsonb_typeof(c.value) = 'object' and c.value->>'reason' is not null
  )
  select reason, count(distinct id)::int, count(*)::int, count(*) filter (where sorted)::int
  from x group by reason
  having count(distinct id) >= 5
  order by 2 desc;
$$;
revoke all on function public.fettle_barriers(text) from public, anon, authenticated;
grant execute on function public.fettle_barriers(text) to service_role;

-- Could you cope? What households said (self-reported confidence: 2 = "Just about", 3 = "Yes, easily") beside what their
-- answers show (capability), at the first check and the latest, per scenario. Rows with fewer than 5 households are left out.
-- Usage: select * from fettle_confidence('Rochdale');
create or replace function public.fettle_confidence(p_area text)
returns table (scenario text, households int, said_cope_first_pct int, said_cope_latest_pct int, ready_first_pct int, ready_latest_pct int, less_sure int, asked int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.data, hh.data->'scores'->0 as f, hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1) as l
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
  ), x as (
    select k.key as scenario, (h.f->'sc'->>k.key)::int as sf, (h.l->'sc'->>k.key)::int as sl,
           coalesce((h.f->'cp'->>k.key)::int,0) as cf, coalesce((h.l->'cp'->>k.key)::int,0) as cl,
           (h.data->'scen'->k.key->>'a')::int as a, h.data->'scen'->k.key->>'b' as b
    from h, jsonb_each(h.f->'sc') as k
  )
  select scenario, count(*)::int,
         round(100.0*count(*) filter (where sf>=2)/count(*))::int, round(100.0*count(*) filter (where sl>=2)/count(*))::int,
         round(100.0*count(*) filter (where cf=1)/count(*))::int, round(100.0*count(*) filter (where cl=1)/count(*))::int,
         count(*) filter (where a>=2 and b='less')::int, count(*) filter (where a>=2 and b is not null)::int
  from x group by scenario having count(*) >= 5 order by scenario;
$$;
revoke all on function public.fettle_confidence(text) from public, anon, authenticated;
grant execute on function public.fettle_confidence(text) to service_role;

-- ============ Winter test: anonymous area counts and start/finish counts ============
-- Both tables are insert-only through the public key: anyone can add a row, nobody can read rows back
-- (no select policy). Totals come only from the functions below, run as service_role in the SQL editor.

-- Anonymous area count: no name, email, postcode or free text. Just the council area and the answers.
create table if not exists public.anon_checks (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  area       text not null check (char_length(area) between 1 and 80),
  nation     text check (nation in ('england','scotland','wales','ni')),
  data       jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 4000)
);
alter table public.anon_checks enable row level security;
drop policy if exists "anyone can add to the anonymous count" on public.anon_checks;
create policy "anyone can add to the anonymous count" on public.anon_checks for insert to anon, authenticated with check (true);
grant insert on public.anon_checks to anon, authenticated;

-- Start/finish counts: the date, what happened, and (for a finished check) the area. No ids, no cookies.
create table if not exists public.fettle_events (
  id   bigint generated always as identity primary key,
  at   date not null default current_date,
  kind text not null check (kind in ('check_started','check_finished')),
  area text check (char_length(area) <= 80)
);
alter table public.fettle_events enable row level security;
drop policy if exists "anyone can add a count" on public.fettle_events;
create policy "anyone can add a count" on public.fettle_events for insert to anon, authenticated with check (true);
grant insert on public.fettle_events to anon, authenticated;

-- How many started and finished the check, overall and per area. Usage: select * from fettle_funnel();
create or replace function public.fettle_funnel()
returns table (area text, started int, finished int)
language sql security definer set search_path = public as $$
  select 'All areas', count(*) filter (where kind='check_started')::int, count(*) filter (where kind='check_finished')::int from public.fettle_events
  union all
  select area, 0, count(*)::int from public.fettle_events where kind='check_finished' and area is not null group by area having count(*) >= 5;
$$;
revoke all on function public.fettle_funnel() from public, anon, authenticated;
grant execute on function public.fettle_funnel() to service_role;

-- First-check picture for an area from the anonymous count, leaving out anyone also counted through a saved plan.
-- Usage: select * from fettle_anon('Rochdale');  Rows with fewer than 5 households are left out.
create or replace function public.fettle_anon(p_area text)
returns table (measure text, households int, yes int, pct int)
language sql security definer set search_path = public as $$
  with a as (
    select ac.data from public.anon_checks ac
    where lower(ac.area) = lower(p_area)
      and not exists (select 1 from public.households hh
                      where hh.data->>'anonId' = ac.data->>'aid' and coalesce((hh.data->>'countMe')::boolean, false))
  ), m as (
    select 'Has: ' || k.key as measure, (k.value::text = 'true') as y from a, jsonb_each(a.data->'m') k
    union all select 'At least one critical risk', jsonb_array_length(coalesce(a.data->'c','[]'::jsonb)) > 0 from a
    union all select 'Said they''d cope: ' || k.key, (k.value::text)::int >= 2 from a, jsonb_each(a.data->'sc') k
    union all select 'Answers show ready: ' || k.key, (k.value::text)::int = 1 from a, jsonb_each(a.data->'cp') k
    union all select 'Less sure after seeing what it takes: ' || k.key, k.value::text = '"less"'
      from a, jsonb_each(a.data->'scb') k
  )
  select measure, count(*)::int, count(*) filter (where y)::int, round(100.0 * count(*) filter (where y) / count(*))::int
  from m group by measure having count(*) >= 5 order by measure;
$$;
revoke all on function public.fettle_anon(text) from public, anon, authenticated;
grant execute on function public.fettle_anon(text) to service_role;

-- Next: run communities.sql for Fettle for Communities (organisations, worker accounts, shared caseloads).
