-- Flood pathway and warning check-ins (November 2026). Run after reminders.sql.
-- 1. Allow the new anonymous counts: the flood tool, joining the emergency list, and warning check-ins.
alter table public.fettle_events drop constraint if exists fettle_events_kind_check;
alter table public.fettle_events add constraint fettle_events_kind_check
  check (kind in ('check_started','check_finished','tool_calc','tool_local','tool_local_found','tool_remind','remind_signup',
                  'tool_flood','tool_flood_found','reg_join','checkin_fine','checkin_maybe','checkin_now'));

-- 2. How many households in a council area have checked in today, for "N households near you have checked in".
--    Anonymous counts only. Fewer than 5 returns nothing, so no one can be singled out.
create or replace function public.fettle_recent_checkins(p_area text)
returns integer language sql stable security definer set search_path = public as $$
  select case when count(*) >= 5 then count(*)::int else null end
  from public.fettle_events
  where kind like 'checkin_%' and lower(area) = lower(p_area) and at >= current_date;
$$;
revoke all on function public.fettle_recent_checkins(text) from public;
grant execute on function public.fettle_recent_checkins(text) to anon, authenticated;
