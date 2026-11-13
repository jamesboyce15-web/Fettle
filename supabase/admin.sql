-- Fettle admin page (/admin), money outcomes and partner results.
-- Run after schema.sql, communities.sql, reports.sql and reminders.sql. Safe to run again.

-- Who may open /admin. Add yourself once in the SQL editor:
--   insert into public.fettle_admins select id from auth.users where email = 'you@example.com' on conflict do nothing;
create table if not exists public.fettle_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.fettle_admins enable row level security; -- no policies: nobody can read or change it from the website

-- Money outcomes for one area, for the Crisis and Resilience Fund: the share of households who could pay an unexpected
-- £200 bill, are behind on a priority bill, or used a food bank or skipped meals, at the first check and the latest.
-- Counts households that ticked "Help your council plan" and answered the question. Rows under 5 households are left out.
-- Usage: select * from fettle_money('Rochdale');
create or replace function public.fettle_money(p_area text)
returns table (measure text, households int, first_pct int, latest_pct int, followed_up int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.data->'scores'->0->'fin' as f0,
           hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->'fin' as f1,
           jsonb_array_length(hh.data->'scores') as len
    from public.households hh
    where coalesce((hh.data->>'countMe')::boolean, false)
      and lower(coalesce(hh.data->>'area','')) = lower(p_area)
      and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
      and jsonb_typeof(hh.data->'scores'->0->'fin') = 'object'
  ), x as (
    select k.ord, k.measure, (h.f0->>k.key)::int as a, coalesce((h.f1->>k.key)::int, (h.f0->>k.key)::int) as b, h.len
    from h cross join (values (1, 'buf', 'Could pay an unexpected £200 bill without borrowing'),
                              (2, 'debt', 'Behind on rent, council tax or energy'),
                              (3, 'food', 'Used a food bank or skipped meals in the last year')) as k(ord, key, measure)
    where h.f0->>k.key is not null
  )
  select measure, count(*)::int, round(100.0 * sum(a) / count(*))::int, round(100.0 * sum(b) / count(*))::int,
         count(*) filter (where len > 1)::int
  from x group by ord, measure having count(*) >= 5 order by ord;
$$;
revoke all on function public.fettle_money(text) from public, anon, authenticated;
grant execute on function public.fettle_money(text) to service_role;

-- Results for each partner link or QR code (?src=rochdale-fire): saved plans that came from it, how many came back
-- for a second check, and the average score at the first check and the latest. Partners under 5 households are left out.
-- Usage: select * from fettle_partners();
create or replace function public.fettle_partners()
returns table (src text, households int, followed_up int, score_first int, score_latest int)
language sql security definer set search_path = public as $$
  with h as (
    select hh.data->>'src' as src, jsonb_array_length(hh.data->'scores') as len,
           (hh.data->'scores'->0->>'s')::int as s0, (hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->>'s')::int as s1
    from public.households hh
    where hh.data->>'src' is not null and jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
  )
  select src, count(*)::int, count(*) filter (where len > 1)::int,
         round(avg(s0))::int, case when count(*) filter (where len > 1) >= 5 then round(avg(s1) filter (where len > 1))::int end
  from h group by src having count(*) >= 5 order by count(*) desc;
$$;
revoke all on function public.fettle_partners() from public, anon, authenticated;
grant execute on function public.fettle_partners() to service_role;

-- The area report now includes the money outcomes.
create or replace function public.fettle_area_report(p_area text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'area', p_area, 'made', now(),
    'outcomes',   (select to_jsonb(t) from fettle_outcomes(p_area) t limit 1),
    'impact',     (select coalesce(jsonb_agg(t), '[]') from fettle_impact(p_area) t),
    'money',      (select coalesce(jsonb_agg(t), '[]') from fettle_money(p_area) t),
    'groups',     (select coalesce(jsonb_agg(t), '[]') from fettle_groups(p_area) t),
    'confidence', (select coalesce(jsonb_agg(t), '[]') from fettle_confidence(p_area) t),
    'barriers',   (select coalesce(jsonb_agg(t), '[]') from fettle_barriers(p_area) t),
    'anon',       (select coalesce(jsonb_agg(t), '[]') from fettle_anon(p_area) t),
    'funnel',     (select coalesce(jsonb_agg(t), '[]') from fettle_funnel() t where t.area in ('All areas', p_area))
  );
$$;
revoke all on function public.fettle_area_report(text) from public, anon, authenticated;
grant execute on function public.fettle_area_report(text) to service_role;

-- Everything the /admin page shows, in one call. Signed-in people may call it, but it only answers for people in
-- fettle_admins: anyone else gets "not allowed". The overview shows true totals, including small ones, because it is
-- for the owner only. The area report inside it still hides any group under 5, so it is safe to pass on.
create or replace function public.fettle_admin(p_area text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.fettle_admins a where a.user_id = auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'made', now(),
    'overview', (
      with h as (
        select hh.data d, jsonb_array_length(hh.data->'scores') as len,
               (hh.data->'scores'->0->>'s')::int as s0, (hh.data->'scores'->(jsonb_array_length(hh.data->'scores')-1)->>'s')::int as s1
        from public.households hh where jsonb_typeof(hh.data->'scores') = 'array' and jsonb_array_length(hh.data->'scores') > 0
      )
      select jsonb_build_object(
        'accounts',     (select count(*) from auth.users),
        'confirmed',    (select count(*) from auth.users where email_confirmed_at is not null),
        'reminders_on', (select count(*) from auth.users u where u.email_confirmed_at is not null and coalesce((u.raw_user_meta_data->>'remind_emails')::boolean, false)),
        'plans',        (select count(*) from h),
        'checked_twice',(select count(*) from h where len > 1),
        'count_me',     (select count(*) from h where coalesce((d->>'countMe')::boolean, false)),
        'score_first',  (select round(avg(s0))::int from h),
        'score_first_twice',  (select round(avg(s0))::int from h where len > 1),
        'score_latest_twice', (select round(avg(s1))::int from h where len > 1),
        'anon_checks',  (select count(*) from public.anon_checks),
        'organisations',(select count(*) from public.organisations),
        'started',      (select count(*) from public.fettle_events where kind = 'check_started'),
        'finished',     (select count(*) from public.fettle_events where kind = 'check_finished'),
        'reminders_sent',(select (select count(*) from public.reminders_sent) + (select count(*) from public.reminders_sent_user))
      )),
    'days', (select coalesce(jsonb_agg(t order by t.day), '[]') from (
        select e.at as day, count(*) filter (where kind = 'check_started')::int as started, count(*) filter (where kind = 'check_finished')::int as finished,
               count(*) filter (where kind like 'tool_%')::int as tools, count(*) filter (where kind = 'remind_signup')::int as reminders
        from public.fettle_events e where e.at >= current_date - 29 group by e.at) t),
    'sources', (select coalesce(jsonb_agg(t order by t.started desc, t.src), '[]') from (
        select coalesce(src, '(no tag)') as src, count(*) filter (where kind = 'check_started')::int as started,
               count(*) filter (where kind = 'check_finished')::int as finished,
               count(*) filter (where kind = 'tool_calc')::int as calc, count(*) filter (where kind = 'tool_local')::int as local_info,
               count(*) filter (where kind = 'tool_remind')::int as remind_page, count(*) filter (where kind = 'remind_signup')::int as remind_signup
        from public.fettle_events group by 1) t),
    'areas', (select coalesce(jsonb_agg(t order by t.finished desc, t.area), '[]') from (
        select a.area, coalesce(e.n, 0) as finished, coalesce(p.n, 0) as plans, coalesce(p.cm, 0) as count_me, coalesce(p.twice, 0) as checked_twice, coalesce(c.n, 0) as anon
        from (select area from public.fettle_events where area is not null
              union select data->>'area' from public.households where data->>'area' is not null
              union select area from public.anon_checks) a
        left join (select area, count(*)::int n from public.fettle_events where kind = 'check_finished' group by area) e on lower(e.area) = lower(a.area)
        left join (select data->>'area' area, count(*)::int n, count(*) filter (where coalesce((data->>'countMe')::boolean, false))::int cm,
                          count(*) filter (where jsonb_typeof(data->'scores') = 'array' and jsonb_array_length(data->'scores') > 1)::int twice
                   from public.households group by 1) p on lower(p.area) = lower(a.area)
        left join (select area, count(*)::int n from public.anon_checks group by area) c on lower(c.area) = lower(a.area)) t),
    'partners', (select coalesce(jsonb_agg(t), '[]') from public.fettle_partners() t),
    'reminders', (select coalesce(jsonb_agg(t), '[]') from public.fettle_reminder_signups() t),
    'area', case when p_area is not null and btrim(p_area) <> '' then public.fettle_area_report(btrim(p_area)) end
  );
end;
$$;
revoke all on function public.fettle_admin(text) from public, anon;
grant execute on function public.fettle_admin(text) to authenticated;
