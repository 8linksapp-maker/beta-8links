-- Allow backlinks without a network site (queued state — site will be assigned later)
alter table public.backlinks alter column network_site_id drop not null;
