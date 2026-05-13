-- Migration: Add missing columns to profiles table
-- Safe to run multiple times (IF NOT EXISTS)
-- Existing rows will have NULL values for new columns

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS kiwify_subscription_id TEXT;

-- Create index on subscription_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id
ON profiles(subscription_id);

-- Create index on payment_provider for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_payment_provider
ON profiles(payment_provider);
