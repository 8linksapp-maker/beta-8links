-- Content pipeline status for keyword planner
-- Tracks: pendente → planejada → escrevendo → publicado → rankeando

ALTER TABLE keywords ADD COLUMN IF NOT EXISTS content_status TEXT DEFAULT 'pendente'
  CHECK (content_status IN ('pendente', 'planejada', 'escrevendo', 'publicado', 'rankeando'));

ALTER TABLE keywords ADD COLUMN IF NOT EXISTS article_url TEXT;

-- Update existing dataforseo keywords to 'pendente'
UPDATE keywords SET content_status = 'pendente' WHERE source = 'dataforseo' AND content_status IS NULL;

-- Index for fast filtering by status
CREATE INDEX IF NOT EXISTS idx_keywords_content_status ON keywords(client_site_id, content_status);
