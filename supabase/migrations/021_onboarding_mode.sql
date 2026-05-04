-- Track which onboarding flow each user completed:
--  simple → user picked "Quick start" (URL + niche only)
--  full   → user picked "Análise completa" (current 9-step flow)
-- Defaults to 'full' so existing users keep their current behavior.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_mode TEXT DEFAULT 'full'
    CHECK (onboarding_mode IN ('simple', 'full'));
