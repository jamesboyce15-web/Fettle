-- Seasonal reminders, including people who signed up at /remind (the workbook's QR code) without doing the online check.
-- Run after schema.sql, communities.sql and reports.sql. Safe to run again.

-- Counts from the workbook tools (no ids, no cookies, same as check_started).
alter table public.fettle_events drop constraint if exists fettle_events_kind_check;
alter table public.fettle_events add constraint fettle_events_kind_check
  check (kind in ('check_started','check_finished','tool_calc','tool_local','tool_local_found','tool_remind','remind_signup'));

-- Reminders sent to people with no saved check. One row per person per season, so nobody gets the same email twice.
create table if not exists public.reminders_sent_user (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.reminders_sent_user enable row level security; -- no policies: server only

-- The season that began most recently on or before t. Seasons begin on 5 January, the Monday after the clocks go
-- forward (last Sunday in March), 20 July, and the Monday after the clocks go back (last Sunday in October).
-- src/fettle.html (seasonStarts) uses the same dates.
create or replace function public.fettle_season_start(t timestamptz default now())
returns date language sql stable as $$
  with y as (select generate_series(extract(year from t)::int - 1, extract(year from t)::int) as y),
  d as (
    select make_date(y, 1, 5) as s from y
    union all select make_date(y, 3, 31) - extract(dow from make_date(y, 3, 31))::int + 1 from y
    union all select make_date(y, 7, 20) from y
    union all select make_date(y, 10, 31) - extract(dow from make_date(y, 10, 31))::int + 1 from y)
  select max(s) from d where s <= t::date;
$$;

-- Who is due an email today. At most one per household or person, and never two within 21 days.
--   day30 / day90: after the first check, to bring people back for a second one (this is what gives councils before-and-after figures).
--   season-YYYY-MM: in the first 14 days of each season, to anyone with reminders on who hasn't checked this season.
-- household_id is null for people with no saved check: their email links to the check itself.
create or replace function public.fettle_recheck_due()
returns table (household_id uuid, user_id uuid, email text, first_name text, household_name text,
               kind text, first_score int, last_score int)
language sql security definer set search_path = public as $$
  with season as (
    select s, 'season-' || to_char(s, 'YYYY-MM') as kind, current_date <= s + 14 as open
    from (select public.fettle_season_start(now()) as s) x
  ), h as (
    select hh.id, hh.user_id, hh.data,
           jsonb_array_length(hh.data->'scores') as n,
           (hh.data->'scores'->0->>'d')::timestamptz as first_at,
           (hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->>'d')::timestamptz as last_at
    from public.households hh
    where hh.user_id is not null and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
  ), cand as (
    select h.id, h.user_id, h.data, h.n, 'day30' as kind, 1 as pri from h where h.n = 1 and h.first_at <= now() - interval '30 days'
    union all
    select h.id, h.user_id, h.data, h.n, 'day90', 2 from h where h.n = 2 and h.first_at <= now() - interval '90 days'
    union all
    select h.id, h.user_id, h.data, h.n, season.kind, 3 from h, season
    where season.open and h.last_at::date < season.s and h.last_at <= now() - interval '21 days'
  ), pick as (
    select distinct on (c.id) c.* from cand c
    where not exists (select 1 from public.reminders_sent r where r.household_id = c.id and r.kind = c.kind)
      and not exists (select 1 from public.reminders_sent r where r.household_id = c.id and r.sent_at > now() - interval '21 days')
    order by c.id, c.pri
  )
  (select p.id, p.user_id, u.email::text, u.raw_user_meta_data->>'first_name', p.data->>'name', p.kind,
          (p.data->'scores'->0->>'s')::int, (p.data->'scores'->(p.n-1)->>'s')::int
   from pick p join auth.users u on u.id = p.user_id
   where coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)
   union all
   select null::uuid, u.id, u.email::text, u.raw_user_meta_data->>'first_name', null::text, season.kind, null::int, null::int
   from auth.users u, season
   where season.open and u.created_at::date < season.s and u.email_confirmed_at is not null
     and coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)
     and not exists (select 1 from public.households hh where hh.user_id = u.id)
     and not exists (select 1 from public.org_members m where m.user_id = u.id)
     and not exists (select 1 from public.reminders_sent_user r where r.user_id = u.id and r.kind = season.kind))
  limit 500;
$$;
revoke all on function public.fettle_recheck_due() from public, anon, authenticated;
grant execute on function public.fettle_recheck_due() to service_role;

-- For council reports: households keeping ready with seasonal reminders, per area. Areas only for people who ticked
-- "Help your council plan" at /remind, and only areas with 5 or more. Usage: select * from fettle_reminder_signups();
create or replace function public.fettle_reminder_signups()
returns table (area text, households int)
language sql security definer set search_path = public as $$
  select 'All areas', count(*)::int from auth.users u
  where u.email_confirmed_at is not null and coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)
  union all
  select u.raw_user_meta_data->>'remind_area', count(*)::int from auth.users u
  where u.email_confirmed_at is not null and coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)
    and coalesce((u.raw_user_meta_data->>'remind_count')::boolean, false) and u.raw_user_meta_data->>'remind_area' is not null
  group by 1 having count(*) >= 5;
$$;
revoke all on function public.fettle_reminder_signups() from public, anon, authenticated;
grant execute on function public.fettle_reminder_signups() to service_role;

-- The funnel, now with the workbook tools: how many opened each one, and which QR code they came from.
create or replace function public.fettle_funnel()
returns table (area text, started int, finished int)
language sql security definer set search_path = public as $$
  select 'All areas', count(*) filter (where kind='check_started')::int, count(*) filter (where kind='check_finished')::int from public.fettle_events
  union all
  select area, 0, count(*)::int from public.fettle_events where kind='check_finished' and area is not null group by area having count(*) >= 5
  union all
  select 'Came from: ' || src, count(*) filter (where kind='check_started')::int, count(*) filter (where kind='check_finished')::int from public.fettle_events where src is not null group by src
  union all
  select 'Opened: ' || kind || coalesce(' (from ' || src || ')', ''), count(*)::int, 0 from public.fettle_events
  where kind like 'tool_%' or kind = 'remind_signup' group by kind, src;
$$;
revoke all on function public.fettle_funnel() from public, anon, authenticated;
grant execute on function public.fettle_funnel() to service_role;
