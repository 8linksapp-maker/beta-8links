-- Cache for DataForSEO keyword_suggestions API calls
-- Same seed + location = same result, saves $0.012/call
CREATE TABLE IF NOT EXISTS keyword_suggestions_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seed TEXT NOT NULL,
  location_code INTEGER NOT NULL DEFAULT 2076,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seed, location_code)
);

-- Index for fast lookup
CREATE INDEX idx_kw_cache_seed ON keyword_suggestions_cache(seed, location_code);

-- No RLS — admin-only table
ALTER TABLE keyword_suggestions_cache DISABLE ROW LEVEL SECURITY;
