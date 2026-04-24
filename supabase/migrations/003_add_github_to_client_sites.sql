-- Add GitHub integration columns
ALTER TABLE public.client_sites ADD COLUMN IF NOT EXISTS github_token text;
ALTER TABLE public.client_sites ADD COLUMN IF NOT EXISTS github_username text;
ALTER TABLE public.client_sites ADD COLUMN IF NOT EXISTS github_repo text;
