-- Track real cost per usage event (instead of relying on fixed unit estimates).
-- Populated by API routes after the underlying OpenAI/DataForSEO calls return.
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS tokens_input  INTEGER,
  ADD COLUMN IF NOT EXISTS tokens_output INTEGER,
  ADD COLUMN IF NOT EXISTS cost_usd      NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS model         TEXT;

-- Allow service role to UPDATE (RLS already lets service role do anything via
-- SUPABASE_SERVICE_ROLE_KEY, but make the intent explicit for clarity).
DROP POLICY IF EXISTS "Service updates usage" ON public.usage_tracking;
CREATE POLICY "Service updates usage" ON public.usage_tracking
  FOR UPDATE USING (true) WITH CHECK (true);
