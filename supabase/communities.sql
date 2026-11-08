-- =====================================================================
-- Fettle for Communities: organisations, workers and resident cases.
-- Run once in Supabase after schema.sql (SQL Editor > New query > paste > Run). Safe to run again.
--
-- How it works
-- * An organisation (a council, housing provider or charity) has members: admins and workers.
-- * People join only with an invite code. Codes are made by Fettle (see "Setting up a pilot" at the
--   bottom) or by an organisation's admin in the app. Nobody can make themselves a member.
-- * A resident's plan made by a worker is an org case: households.org_id is set and user_id is empty.
--   Every member of that organisation can see and update it. Nobody else can, including Fettle's own
--   public users. Deleting a worker's account does NOT delete the residents' plans.
-- * case_events keeps a simple record of who created, visited, verified or deleted each case.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  wards       text[] not null default '{}',     -- areas workers can choose from; empty = free text
  created_at  timestamptz not null default now()
);

create table if not exists public.org_members (
  org_id      uuid not null references public.organisations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('admin','worker')),
  job_title   text,
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index if not exists org_members_user_idx on public.org_members(user_id);

create table if not exists public.org_invites (
  code        text primary key,
  org_id      uuid not null references public.organisations(id) on delete cascade,
  role        text not null default 'worker' check (role in ('admin','worker')),
  email       text,                                -- if set, only this email can use the code
  created_by  uuid references auth.users(id) on delete set null,
  expires_at  timestamptz not null default now() + interval '14 days',
  used_at     timestamptz,
  used_by     uuid references auth.users(id) on delete set null
);

-- Org cases: owned by the organisation, not by a person.
alter table public.households add column if not exists org_id     uuid references public.organisations(id) on delete cascade;
alter table public.households add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.households add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.households alter column user_id drop not null;
do $$ begin
  alter table public.households add constraint households_owner check (user_id is not null or org_id is not null);
exception when duplicate_object then null; end $$;
create index if not exists households_org_idx on public.households(org_id);

create table if not exists public.case_events (
  id           bigint generated always as identity primary key,
  household_id uuid references public.households(id) on delete set null,
  org_id       uuid not null references public.organisations(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null check (action in ('created','visit','verified','updated','deleted','report')),
  ref          text,                               -- the case reference, kept even if the case is deleted
  at           timestamptz not null default now()
);
create index if not exists case_events_org_idx on public.case_events(org_id, at desc);

-- Membership check used by the policies (security definer avoids policy recursion).
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = p_org and m.user_id = auth.uid());
$$;
create or replace function public.is_org_admin(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'admin');
$$;

-- Policies
alter table public.organisations enable row level security;
alter table public.org_members   enable row level security;
alter table public.org_invites   enable row level security;
alter table public.case_events   enable row level security;

drop policy if exists "members read their organisation" on public.organisations;
create policy "members read their organisation" on public.organisations for select using (public.is_org_member(id));

drop policy if exists "members read their team" on public.org_members;
create policy "members read their team" on public.org_members for select using (user_id = auth.uid() or public.is_org_member(org_id));
-- No insert/update/delete: membership changes only through the join-org server function (service role).

-- org_invites: no policies. Only the server can read or write invite codes.

drop policy if exists "members read case history" on public.case_events;
create policy "members read case history" on public.case_events for select using (public.is_org_member(org_id));
drop policy if exists "members add case history" on public.case_events;
create policy "members add case history" on public.case_events for insert with check (public.is_org_member(org_id) and user_id = auth.uid());

-- Households: personal plans stay private to their owner; org cases are shared with the organisation only.
drop policy if exists "read own plans"   on public.households;
drop policy if exists "add own plans"    on public.households;
drop policy if exists "change own plans" on public.households;
drop policy if exists "delete own plans" on public.households;
create policy "read own plans"   on public.households for select using (org_id is null and auth.uid() = user_id);
create policy "add own plans"    on public.households for insert with check (org_id is null and auth.uid() = user_id);
create policy "change own plans" on public.households for update using (org_id is null and auth.uid() = user_id) with check (org_id is null and auth.uid() = user_id);
create policy "delete own plans" on public.households for delete using (org_id is null and auth.uid() = user_id);

drop policy if exists "org reads cases"   on public.households;
drop policy if exists "org adds cases"    on public.households;
drop policy if exists "org changes cases" on public.households;
drop policy if exists "org deletes cases" on public.households;
create policy "org reads cases"   on public.households for select using (org_id is not null and public.is_org_member(org_id));
create policy "org adds cases"    on public.households for insert with check (org_id is not null and user_id is null and created_by = auth.uid() and public.is_org_member(org_id));
create policy "org changes cases" on public.households for update using (org_id is not null and public.is_org_member(org_id)) with check (org_id is not null and user_id is null and public.is_org_member(org_id));
create policy "org deletes cases" on public.households for delete using (org_id is not null and public.is_org_member(org_id));

-- =====================================================================
-- Setting up a pilot (run these yourself in the SQL editor; they need the service role).
--   select * from fettle_create_org('Rochdale Borough Council', array['Balderstone and Kirkholt','Kingsway','Spotland and Falinge']);
--   -> returns the organisation id and a first admin invite code. Send the code to the pilot lead.
--   select fettle_invite('<organisation id>', 'worker', 'name@council.gov.uk');   -- more codes if needed
-- =====================================================================
create or replace function public.fettle_new_code() returns text language sql volatile as $$
  select upper(substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1Il', ''), 1, 4) || '-' ||
               substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=0O1Il', ''), 1, 4));
$$;
create or replace function public.fettle_create_org(p_name text, p_wards text[] default '{}')
returns table (org_id uuid, admin_code text) language plpgsql security definer set search_path = public as $$
declare o uuid; c text;
begin
  insert into organisations(name, wards) values (p_name, coalesce(p_wards, '{}')) returning id into o;
  c := fettle_new_code();
  insert into org_invites(code, org_id, role) values (c, o, 'admin');
  return query select o, c;
end $$;
create or replace function public.fettle_invite(p_org uuid, p_role text default 'worker', p_email text default null)
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  c := fettle_new_code();
  insert into org_invites(code, org_id, role, email) values (c, p_org, p_role, lower(p_email));
  return c;
end $$;
revoke all on function public.fettle_create_org(text, text[]) from public, anon, authenticated;
revoke all on function public.fettle_invite(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fettle_new_code() from public, anon, authenticated;
grant execute on function public.fettle_create_org(text, text[]) to service_role;
grant execute on function public.fettle_invite(uuid, text, text) to service_role;
grant execute on function public.fettle_new_code() to service_role;
