-- ============================================================================
-- Creem × Supabase SaaS starter — initial schema
-- ============================================================================
-- This migration creates:
--   profiles          one row per auth.users user, kept in sync via trigger
--   subscriptions     Creem subscriptions tracked per user
--   credit_wallets    balance per user (1:1)
--   credit_ledger     append-only history of credit changes
--   webhook_events    idempotency log for Creem webhooks
--
-- RLS: users can read their own rows. Writes flow through the service-role
-- key (webhooks, server actions) — no client-side mutations.
-- ============================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'paused',
      'unpaid'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'credit_ledger_reason') then
    create type credit_ledger_reason as enum (
      'signup_bonus',
      'subscription_topup',
      'purchase',
      'spend',
      'refund',
      'admin_adjust'
    );
  end if;
end
$$;

-- -------------------------------------------------------------
-- profiles
-- -------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  creem_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_creem_customer_idx on public.profiles (creem_customer_id);

-- Keep profiles synced with auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();

  -- Seed a wallet with the free-tier signup bonus
  insert into public.credit_wallets (user_id, balance, lifetime_earned)
  values (new.id, 25, 25)
  on conflict (user_id) do nothing;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  values (new.id, 25, 25, 'signup_bonus', '{}'::jsonb);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- subscriptions
-- -------------------------------------------------------------

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  creem_subscription_id text not null unique,
  creem_customer_id text not null,
  creem_product_id text not null,
  plan_key text not null,
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- -------------------------------------------------------------
-- credit wallets + ledger
-- -------------------------------------------------------------

create table if not exists public.credit_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0,
  lifetime_spent integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason credit_ledger_reason not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx on public.credit_ledger (user_id, created_at desc);

-- Atomic wallet mutator. Negative deltas are allowed as long as the resulting
-- balance stays >= 0 (CHECK on credit_wallets enforces that). Returns the new
-- balance. Call from server-side code only (service-role or SQL RPC).
create or replace function public.add_credits(
  p_user uuid,
  p_delta integer,
  p_reason credit_ledger_reason,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  insert into public.credit_wallets (user_id, balance)
  values (p_user, 0)
  on conflict (user_id) do nothing;

  update public.credit_wallets
     set balance = balance + p_delta,
         lifetime_earned = lifetime_earned + greatest(p_delta, 0),
         lifetime_spent = lifetime_spent + greatest(-p_delta, 0),
         updated_at = now()
   where user_id = p_user
  returning balance into new_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  values (p_user, p_delta, new_balance, p_reason, coalesce(p_metadata, '{}'::jsonb));

  return new_balance;
end;
$$;

grant execute on function public.add_credits(uuid, integer, credit_ledger_reason, jsonb)
  to service_role;

-- -------------------------------------------------------------
-- webhook_events (idempotency log)
-- -------------------------------------------------------------

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- -------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.webhook_events enable row level security;

-- profiles: user can see + update their own row
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- subscriptions: read-only from the client; writes via service role
drop policy if exists "subscriptions_self_select" on public.subscriptions;
create policy "subscriptions_self_select"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- credit_wallets: read-only from the client
drop policy if exists "wallets_self_select" on public.credit_wallets;
create policy "wallets_self_select"
  on public.credit_wallets for select
  using (auth.uid() = user_id);

-- credit_ledger: read-only from the client
drop policy if exists "ledger_self_select" on public.credit_ledger;
create policy "ledger_self_select"
  on public.credit_ledger for select
  using (auth.uid() = user_id);

-- webhook_events: never exposed to users
drop policy if exists "webhook_events_deny" on public.webhook_events;
create policy "webhook_events_deny"
  on public.webhook_events for select
  using (false);

-- -------------------------------------------------------------
-- updated_at touch trigger
-- -------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

drop trigger if exists wallets_touch on public.credit_wallets;
create trigger wallets_touch before update on public.credit_wallets
  for each row execute function public.touch_updated_at();
