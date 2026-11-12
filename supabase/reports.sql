-- Fettle reports: run after schema.sql and communities.sql. Safe to run again: re-running only updates the functions.
-- Everything here is read by you (service_role) in the SQL editor; the website can only add rows to the two count tables.

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
alter table public.fettle_events add column if not exists src text check (src ~ '^[a-z0-9-]{1,20}$');   -- e.g. 'workbook', from a QR code
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
  select area, 0, count(*)::int from public.fettle_events where kind='check_finished' and area is not null group by area having count(*) >= 5
  union all
  select 'Came from: ' || src, count(*) filter (where kind='check_started')::int, count(*) filter (where kind='check_finished')::int from public.fettle_events where src is not null group by src;
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
    select 'Has: ' || k.key as measure, (k.value::text in ('1','true')) as y from a, jsonb_each(a.data->'m') k where k.value <> 'null'::jsonb
    union all select 'At least one critical risk', jsonb_array_length(coalesce(a.data->'c','[]'::jsonb)) > 0 from a
    union all select 'Said they''d cope: ' || k.key, (k.value::text)::int >= 2 from a, jsonb_each(a.data->'sc') k
    union all select 'Answers show ready: ' || k.key, (k.value::text)::int = 1 from a, jsonb_each(a.data->'cp') k
    union all select 'Less sure after seeing what it takes: ' || k.key, k.value::text = '"less"'
      from a, jsonb_each(a.data->'scb') k
    union all select 'At least one critical risk, ' || case g.key when 'social' then 'social renters' when 'rent' then 'private renters'
        when 'own' then 'homeowners' when 'alone' then 'living alone' when 'o70' then 'someone over 70'
        when 'health' then 'disability or long-term condition' when 'temp' then 'temporary or supported accommodation'
        when 'prepay' then 'prepayment meter' when 'nospend' then 'can''t spend anything right now' else 'young children' end,
      jsonb_array_length(coalesce(a.data->'c','[]'::jsonb)) > 0
      from a, jsonb_each(a.data->'f') g where g.value::text = 'true' and g.key in ('social','rent','own','alone','o70','health','u5','temp','prepay','nospend')
  )
  select measure, count(*)::int, count(*) filter (where y)::int, round(100.0 * count(*) filter (where y) / count(*))::int
  from m group by measure having count(*) >= 5 order by measure;
$$;
revoke all on function public.fettle_anon(text) from public, anon, authenticated;
grant execute on function public.fettle_anon(text) to service_role;

-- ============ Who it reached, and the whole area report ============
-- The same outcomes split by kinds of household: tenure (standing in for income), living alone, over 70,
-- disability or long-term condition, young children. Households can be in more than one group.
-- "sorted_30d" = households that sorted a "do first" job or a critical risk within 30 days of their first check
-- (out of "eligible_30d", those whose first check was 30 or more days ago). Groups under 5 households are left out.
-- Usage: select * from fettle_groups('Rochdale');
create or replace function public.fettle_groups(p_area text)
returns table (grp text, households int, followed_up int, score_first int, score_latest int, eligible_30d int, sorted_30d int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.data d, (hh.data->'scores'->0->>'d')::timestamptz as first_at, jsonb_array_length(hh.data->'scores') as len,
           (hh.data->'scores'->0->>'s')::int as s0, (hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->>'s')::int as s1
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
  ), k as (
    select h.*, exists (select 1 from jsonb_each(coalesce(h.d->'done','{}'::jsonb)) x
                        where jsonb_typeof(x.value) = 'object'
                          and (coalesce((x.value->>'pri')::int, 0) = 1 or coalesce((x.value->>'crit')::boolean, false))
                          and (x.value->>'d')::timestamptz <= h.first_at + interval '30 days') as hit,
           coalesce((h.d->>'adults')::int,0) + coalesce((h.d->>'over70')::int,0) + coalesce((h.d->>'under5')::int,0) + coalesce((h.d->>'kids')::int,0) as people
    from h
  ), g as (
    select k.*, x.ord, x.grp from k cross join lateral (values
      (0, 'All households', true),
      (1, 'Social renters', k.d->>'tenure' = 'social'),
      (2, 'Private renters', k.d->>'tenure' = 'rent'),
      (3, 'Homeowners', k.d->>'tenure' = 'own'),
      (4, 'Living alone', k.people = 1),
      (5, 'Someone over 70', coalesce((k.d->>'over70')::int,0) > 0),
      (6, 'Disability or long-term condition', k.d->>'healthGate' = 'yes' and jsonb_array_length(coalesce(k.d->'health','[]'::jsonb)) > 0),
      (7, 'Young children', coalesce((k.d->>'under5')::int,0) + coalesce((k.d->>'babies')::int,0) > 0),
      (8, 'Temporary or supported accommodation', k.d->>'tenure' = 'temp'),
      (9, 'On a prepayment meter', k.d->>'pay' = 'prepay'),
      (10, 'Can''t spend anything right now', k.d->>'budget' = '0')
    ) as x(ord, grp, inside) where x.inside
  )
  -- Scores need 5+ households with a follow-up; the 30-day figures need 5+ households 30 days on. Otherwise null.
  select grp, count(*)::int, count(*) filter (where len > 1)::int,
         case when count(*) filter (where len > 1) >= 5 then round(avg(s0) filter (where len > 1))::int end,
         case when count(*) filter (where len > 1) >= 5 then round(avg(s1) filter (where len > 1))::int end,
         count(*) filter (where first_at <= now() - interval '30 days')::int,
         case when count(*) filter (where first_at <= now() - interval '30 days') >= 5
              then count(*) filter (where first_at <= now() - interval '30 days' and hit)::int end
  from g group by ord, grp having count(*) >= 5 order by ord;
$$;
revoke all on function public.fettle_groups(text) from public, anon, authenticated;
grant execute on function public.fettle_groups(text) to service_role;

-- Everything for one area in one go, for the area results report (tools/area-report.html).
-- Usage: select fettle_area_report('Rochdale');  then copy the result into the report page.
create or replace function public.fettle_area_report(p_area text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'area', p_area, 'made', now(),
    'outcomes',   (select to_jsonb(t) from fettle_outcomes(p_area) t limit 1),
    'impact',     (select coalesce(jsonb_agg(t), '[]') from fettle_impact(p_area) t),
    'groups',     (select coalesce(jsonb_agg(t), '[]') from fettle_groups(p_area) t),
    'confidence', (select coalesce(jsonb_agg(t), '[]') from fettle_confidence(p_area) t),
    'barriers',   (select coalesce(jsonb_agg(t), '[]') from fettle_barriers(p_area) t),
    'anon',       (select coalesce(jsonb_agg(t), '[]') from fettle_anon(p_area) t),
    'funnel',     (select coalesce(jsonb_agg(t), '[]') from fettle_funnel() t where t.area in ('All areas', p_area))
  );
$$;
revoke all on function public.fettle_area_report(text) from public, anon, authenticated;
grant execute on function public.fettle_area_report(text) to service_role;
