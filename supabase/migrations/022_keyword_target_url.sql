-- Each keyword in the user's plan can point to a specific page of their site.
-- When empty, the system uses the site's root URL when creating backlinks.
ALTER TABLE public.keywords
  ADD COLUMN IF NOT EXISTS target_url TEXT;
