-- Posts publicados nos sites da rede
-- Os sites Astro leem desta tabela via Supabase client (anon key, read-only)
CREATE TABLE IF NOT EXISTS network_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_site_id UUID NOT NULL REFERENCES network_sites(id) ON DELETE CASCADE,
  backlink_id UUID REFERENCES backlinks(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  featured_image TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, slug)
);

CREATE INDEX idx_network_posts_domain ON network_posts(domain, published_at DESC);

-- RLS: público para leitura (os sites Astro usam anon key)
ALTER TABLE network_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read network posts" ON network_posts
  FOR SELECT USING (true);

-- Só service role insere (via process-backlink)
CREATE POLICY "Service inserts network posts" ON network_posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service updates network posts" ON network_posts
  FOR UPDATE USING (true);
