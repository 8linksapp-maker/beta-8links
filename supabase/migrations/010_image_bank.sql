-- Image bank: cached images from Unsplash/Pexels with Vision-generated tags
create table public.image_bank (
  id uuid primary key default uuid_generate_v4(),
  storage_url text not null,
  storage_path text not null,
  original_url text not null,
  description text not null default '',
  tags text[] not null default '{}',
  search_query_en text,
  search_query_pt text,
  credit text not null default '',
  width integer not null default 0,
  height integer not null default 0,
  source text not null default 'unsplash' check (source in ('unsplash', 'pexels', 'manual')),
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Index for tag search (GIN for array overlap)
create index idx_image_bank_tags on public.image_bank using gin (tags);
create index idx_image_bank_used on public.image_bank(used_count);
