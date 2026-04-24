-- Content calendar: planned keywords per network site
create table public.content_calendar (
  id uuid primary key default uuid_generate_v4(),
  network_site_id uuid not null references public.network_sites(id) on delete cascade,
  keyword text not null,
  volume integer not null default 0,
  difficulty integer not null default 0,
  status text not null default 'planned' check (status in ('planned', 'writing', 'published', 'assigned')),
  article_id uuid,
  assigned_client_site_id uuid references public.client_sites(id),
  created_at timestamptz not null default now()
);

create index idx_content_calendar_site on public.content_calendar(network_site_id);
create index idx_content_calendar_status on public.content_calendar(status);
create index idx_content_calendar_keyword on public.content_calendar(keyword);
