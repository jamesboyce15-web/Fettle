-- Shared family plans (November 2026). Run after communities.sql.
-- A plan's owner (households.user_id) can invite family by link. People who accept can read and update the plan
-- from their own account. They can't delete it, change who owns it, or see any other plan. Council caseloads
-- (org_id not null) can't be shared this way.

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text check (char_length(name) <= 60),
  added_at     timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists household_members_user_idx on public.household_members(user_id);
alter table public.household_members enable row level security;

create table if not exists public.household_invites (
  token        text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  uses         integer not null default 0
);
alter table public.household_invites enable row level security; -- no policies: only the functions below touch it

create or replace function public.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = p_household and user_id = auth.uid());
$$;
revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

-- Family can read and update a shared plan. Owners keep their existing policies.
drop policy if exists "family reads shared plans" on public.households;
create policy "family reads shared plans" on public.households for select
  using (org_id is null and public.is_household_member(id));
drop policy if exists "family changes shared plans" on public.households;
create policy "family changes shared plans" on public.households for update
  using (org_id is null and public.is_household_member(id)) with check (org_id is null);

-- Nobody changes who owns a plan, which organisation it belongs to, or who created it, from the app.
create or replace function public.households_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and (new.user_id is distinct from old.user_id or new.org_id is distinct from old.org_id
     or new.created_by is distinct from old.created_by) then
    raise exception 'A plan''s owner can''t be changed';
  end if;
  return new;
end $$;
drop trigger if exists households_guard on public.households;
create trigger households_guard before update on public.households for each row execute function public.households_guard();

-- Members: everyone in the plan can see who else is in it. The owner can remove anyone; anyone can leave.
drop policy if exists "see family members" on public.household_members;
create policy "see family members" on public.household_members for select using (
  user_id = auth.uid() or public.is_household_member(household_id)
  or exists (select 1 from public.households h where h.id = household_id and h.user_id = auth.uid() and h.org_id is null));
drop policy if exists "leave or remove family" on public.household_members;
create policy "leave or remove family" on public.household_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.households h where h.id = household_id and h.user_id = auth.uid() and h.org_id is null));
grant select, delete on public.household_members to authenticated;

-- Make an invite link for a plan you own or are in. Valid for 14 days.
create or replace function public.create_household_invite(p_household uuid)
returns text language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if not exists (select 1 from public.households where id = p_household and org_id is null
                 and (user_id = auth.uid() or public.is_household_member(p_household))) then
    raise exception 'You can''t share that plan';
  end if;
  if (select count(*) from public.household_invites where household_id = p_household and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many invites today. Try again tomorrow';
  end if;
  tok := replace(gen_random_uuid()::text, '-', '');
  insert into public.household_invites (token, household_id, created_by) values (tok, p_household, auth.uid());
  return tok;
end $$;
revoke all on function public.create_household_invite(uuid) from public, anon;
grant execute on function public.create_household_invite(uuid) to authenticated;

-- Accept an invite: join the plan. Up to 10 people per plan.
create or replace function public.accept_household_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv public.household_invites;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into inv from public.household_invites where token = p_token and expires_at > now();
  if not found then raise exception 'This invite has expired. Ask for a new link'; end if;
  if exists (select 1 from public.households where id = inv.household_id and user_id = auth.uid()) then return inv.household_id; end if;
  if (select count(*) from public.household_members where household_id = inv.household_id) >= 10 then
    raise exception 'This plan already has 10 people in it';
  end if;
  insert into public.household_members (household_id, user_id, name)
    values (inv.household_id, auth.uid(), left(coalesce(auth.jwt() -> 'user_metadata' ->> 'first_name', ''), 60))
    on conflict do nothing;
  update public.household_invites set uses = uses + 1 where token = p_token;
  return inv.household_id;
end $$;
revoke all on function public.accept_household_invite(text) from public, anon;
grant execute on function public.accept_household_invite(text) to authenticated;
