-- Fettle Plus subscriptions. Written only by the Stripe webhook (service role). Each person can read their own row.
-- Postal addresses for "Plus with Post" stay in Stripe (collected at checkout): Fettle doesn't store them.
create table if not exists public.subscriptions (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  plan                    text not null check (plan in ('plus','post')),
  period                  text not null check (period in ('month','year')),
  status                  text not null,                 -- Stripe's: active, trialing, past_due, canceled, unpaid...
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  livemode                boolean not null default false,
  updated_at              timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions for select to authenticated using (user_id = auth.uid());

-- Is this person a paying Fettle Plus member? Used by the email worker when PLUS_REQUIRED is on.
create or replace function public.fettle_plus_users()
returns table (user_id uuid, plan text)
language sql stable security definer set search_path = public as $$
  select user_id, plan from public.subscriptions where status in ('active','trialing','past_due');
$$;
revoke all on function public.fettle_plus_users() from public, anon, authenticated;
grant execute on function public.fettle_plus_users() to service_role;
