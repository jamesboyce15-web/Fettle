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
