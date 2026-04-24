-- ============================================
-- EXTERNAL BACKLINKS (discovered via DataForSEO)
-- Cached to avoid repeated API calls
-- ============================================
create table public.external_backlinks (
  id uuid primary key default uuid_generate_v4(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  domain_from text not null,
  url_from text,
  url_to text,
  page_title text,
  anchor text,
  text_pre text,
  text_post text,
  link_context text,
  dofollow boolean not null default true,
  authority_points integer not null default 0,
  backlink_count integer not null default 1,
  last_seen timestamptz,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_external_backlinks_site on public.external_backlinks(client_site_id);
create index idx_external_backlinks_domain on public.external_backlinks(domain_from);

-- Add last fetch timestamp to client_sites
alter table public.client_sites add column if not exists backlinks_fetched_at timestamptz;

-- RLS
alter table public.external_backlinks enable row level security;

create policy "Users see own external backlinks" on public.external_backlinks for select using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

create policy "Service can insert external backlinks" on public.external_backlinks for insert with check (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

create policy "Service can delete external backlinks" on public.external_backlinks for delete using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);
