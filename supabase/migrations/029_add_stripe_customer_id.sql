-- ============================================
-- Add stripe_customer_id to profiles
-- ============================================

alter table public.profiles
  add column if not exists stripe_customer_id text;

alter table public.profiles
  add column if not exists kiwify_subscription_id text;

-- Create index for faster lookups
create index if not exists idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index if not exists idx_profiles_kiwify_subscription on public.profiles(kiwify_subscription_id);
