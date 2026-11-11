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

-- Reports for the winter test (anonymous count, start/finish counts, who it reached, area report) are in reports.sql.

-- Next: run communities.sql (organisations, worker accounts, shared caseloads), then reports.sql.
