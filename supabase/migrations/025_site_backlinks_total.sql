-- Total backlinks count from DataForSEO summary (cached so we don't have to count external_backlinks rows).
-- Updated together with GSC metrics and DA in the monthly sync.
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS external_backlinks_total INTEGER;
