-- Add Moz metrics to network_sites
ALTER TABLE network_sites ADD COLUMN IF NOT EXISTS pa INTEGER DEFAULT 0;
ALTER TABLE network_sites ADD COLUMN IF NOT EXISTS spam_score INTEGER DEFAULT 0;
ALTER TABLE network_sites ADD COLUMN IF NOT EXISTS referring_domains INTEGER DEFAULT 0;
ALTER TABLE network_sites ADD COLUMN IF NOT EXISTS external_backlinks INTEGER DEFAULT 0;
ALTER TABLE network_sites ADD COLUMN IF NOT EXISTS moz_last_updated TIMESTAMPTZ;
