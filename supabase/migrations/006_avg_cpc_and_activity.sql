-- Add avg_cpc to client_sites (calculated from DataForSEO keyword CPC)
alter table public.client_sites add column if not exists avg_cpc numeric(6,2) default 0;

-- Track last user activity to skip inactive sites in crons
alter table public.profiles add column if not exists last_active_at timestamptz default now();

-- Index for cron to quickly find active users
create index if not exists idx_profiles_last_active on public.profiles(last_active_at);
