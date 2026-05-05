-- Each page on a site can be targeted by at most ONE keyword.
-- Prevents two keywords from pointing to the same target_url
-- (which would cause duplicate articles + keyword conflicts).
-- Partial index: only enforces uniqueness when target_url is set.
CREATE UNIQUE INDEX IF NOT EXISTS keywords_unique_target_per_site
  ON public.keywords (client_site_id, target_url)
  WHERE target_url IS NOT NULL;
