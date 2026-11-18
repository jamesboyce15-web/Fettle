-- Postcode alerts (November 2026). Run after family.sql.
-- 1. Which warnings each person has been sent, so nobody gets the same one twice. Only the alerts worker touches it.
create table if not exists public.alerts_sent (
  user_id   uuid not null references auth.users(id) on delete cascade,
  alert_key text not null check (char_length(alert_key) <= 300),
  sent_at   timestamptz not null default now(),
  primary key (user_id, alert_key)
);
create index if not exists alerts_sent_at_idx on public.alerts_sent(sent_at);
alter table public.alerts_sent enable row level security; -- no policies: service role only

-- 2. Who to tell: everyone who turned on warning emails, for each home they own or were invited to, with only what
--    the worker needs (location, a name for the home, and whether someone there is more at risk). No health details.
create or replace function public.fettle_alert_targets()
returns table (user_id uuid, email text, first_name text, household_id uuid, owner boolean, vulnerable boolean, data jsonb)
language sql security definer set search_path = public as $$
  with people as (
    select h.id as hid, h.user_id as uid, true as owner from public.households h where h.user_id is not null and h.org_id is null
    union
    select m.household_id, m.user_id, false from public.household_members m
    join public.households h on h.id = m.household_id and h.org_id is null
  )
  select u.id, u.email::text, u.raw_user_meta_data->>'first_name', h.id, p.owner,
    (coalesce((h.data->>'over70')::int, 0) > 0 or coalesce((h.data->>'under5')::int, 0) > 0
      or jsonb_array_length(case when jsonb_typeof(h.data->'health') = 'array' then h.data->'health' else '[]'::jsonb end) > 0
      or h.data->>'carers' in ('daily', 'more')),
    jsonb_build_object('lat', h.data->'lat', 'lng', h.data->'lng', 'other', h.data->'other', 'name', h.data->>'name', 'surname', h.data->>'surname')
  from people p
  join public.households h on h.id = p.hid
  join auth.users u on u.id = p.uid
  where u.email_confirmed_at is not null
    and coalesce((u.raw_user_meta_data->>'alert_emails')::boolean, false)
    and jsonb_typeof(h.data->'lat') = 'number' and jsonb_typeof(h.data->'lng') = 'number'
  limit 10000;
$$;
revoke all on function public.fettle_alert_targets() from public, anon, authenticated;
grant execute on function public.fettle_alert_targets() to service_role;

-- 3. Keep the record short: a warning is never re-sent within 14 days, so older rows aren't needed.
create or replace function public.fettle_prune_alerts() returns void language sql security definer set search_path = public as $$
  delete from public.alerts_sent where sent_at < now() - interval '30 days';
$$;
revoke all on function public.fettle_prune_alerts() from public, anon, authenticated;
grant execute on function public.fettle_prune_alerts() to service_role;

-- 4. Count people turning warnings on, anonymously.
alter table public.fettle_events drop constraint if exists fettle_events_kind_check;
alter table public.fettle_events add constraint fettle_events_kind_check
  check (kind in ('check_started','check_finished','tool_calc','tool_local','tool_local_found','tool_remind','remind_signup',
                  'tool_flood','tool_flood_found','reg_join','checkin_fine','checkin_maybe','checkin_now',
                  'family_circle','family_checkin',
                  'connect_open','connect_yes','connect_maybe','connect_no','connect_landing','connect_book','connect_emergency','connect_recover',
                  'alerts_on'));
