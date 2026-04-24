-- View "posts" que os sites Astro já esperam
-- Mapeia network_posts → formato que o posts.ts do Astro lê
-- Os sites usam: supabase.from('posts').select('*').eq('network_site_id', X)

-- Drop view if exists (safe to re-run)
DROP VIEW IF EXISTS posts;

CREATE VIEW posts AS
SELECT
  np.id,
  np.network_site_id,
  np.slug,
  np.title,
  np.meta_description AS description,
  np.published_at AS pub_date,
  np.featured_image AS hero_image,
  'Geral' AS category,
  np.content,
  TRUE AS is_published,
  np.domain,
  np.created_at
FROM network_posts np;
