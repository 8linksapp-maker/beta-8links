-- Site context: scraped pages, GPT summary, user preferences (tone, content type, audience)
alter table public.client_sites add column if not exists site_context jsonb default '{}';
