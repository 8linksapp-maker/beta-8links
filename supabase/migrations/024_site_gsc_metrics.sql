-- Cached GSC metrics so we don't have to hit Google's API every time the user lands on /sites.
-- Updated when user clicks "Atualizar agora".
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS gsc_clicks_28d INTEGER,
  ADD COLUMN IF NOT EXISTS gsc_impressions_28d INTEGER,
  ADD COLUMN IF NOT EXISTS gsc_avg_position NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
