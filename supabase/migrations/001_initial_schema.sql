-- ============================================
-- 8LINKS v2 — DATABASE SCHEMA
-- ============================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- PLANS
-- ============================================
create table public.plans (
  id text primary key,
  name text not null,
  price_brl integer not null,
  sites_limit integer not null,
  credits_monthly integer not null,
  keywords_limit integer not null,
  stripe_price_id text,
  kiwify_checkout_url text,
  features jsonb not null default '{}',
  created_at timestamptz not null default now()
);

insert into public.plans (id, name, price_brl, sites_limit, credits_monthly, keywords_limit, features) values
  ('starter', 'Starter', 147, 1, 100, 10, '{"wordpress": false, "crm": false, "whiteLabel": false, "courses": "basic", "support": "bot"}'),
  ('pro', 'Pro', 297, 5, 500, 50, '{"wordpress": true, "crm": true, "whiteLabel": false, "courses": "all", "support": "priority"}'),
  ('agency', 'Agência', 597, 15, 2000, 200, '{"wordpress": true, "crm": true, "whiteLabel": true, "courses": "all", "support": "dedicated"}');

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  plan_id text not null default 'starter' references public.plans(id),
  subscription_status text not null default 'trialing' check (subscription_status in ('active', 'trialing', 'canceled', 'past_due')),
  subscription_id text,
  payment_provider text check (payment_provider in ('stripe', 'kiwify')),
  credits_balance integer not null default 100,
  credits_reset_at timestamptz not null default (now() + interval '30 days'),
  reseller_id uuid references public.profiles(id),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- CLIENT SITES
-- ============================================
create table public.client_sites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  niche_primary text,
  niche_secondary text,
  da_current integer not null default 0,
  da_history jsonb not null default '[]',
  seo_score integer not null default 0,
  phase text not null default 'planting' check (phase in ('planting', 'sprouting', 'growing', 'harvesting')),
  autopilot_active boolean not null default true,
  wp_url text,
  wp_username text,
  wp_app_password text, -- encrypted at application level
  ga_property_id text,
  gsc_site_url text,
  google_refresh_token text, -- encrypted at application level
  brand_voice jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_client_sites_user on public.client_sites(user_id);

-- ============================================
-- NETWORK SITES (partner sites)
-- ============================================
create table public.network_sites (
  id uuid primary key default uuid_generate_v4(),
  domain text not null unique,
  niche text not null,
  da integer not null default 0,
  site_type text not null default 'blog' check (site_type in ('blog', 'portal', 'magazine', 'news')),
  hosting text not null default 'jamstack' check (hosting in ('jamstack', 'wordpress')),
  status text not null default 'active' check (status in ('active', 'paused', 'inactive')),
  deploy_url text,
  created_at timestamptz not null default now()
);

-- ============================================
-- NICHE CONTEXTS (matching compatibility)
-- ============================================
create table public.niche_contexts (
  id uuid primary key default uuid_generate_v4(),
  niche_a text not null,
  niche_b text not null,
  compatibility_score numeric(3,2) not null check (compatibility_score between 0 and 1),
  created_at timestamptz not null default now(),
  unique(niche_a, niche_b)
);

-- ============================================
-- BACKLINKS
-- ============================================
create table public.backlinks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  network_site_id uuid not null references public.network_sites(id),
  target_url text not null,
  anchor_text text not null,
  anchor_type text not null default 'partial' check (anchor_type in ('exact', 'partial', 'branded', 'generic', 'url')),
  article_title text,
  article_content text,
  published_url text,
  status text not null default 'queued' check (status in ('queued', 'generating', 'published', 'indexed', 'error')),
  da_at_creation integer,
  context_explanation text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  indexed_at timestamptz,
  error_message text
);

create index idx_backlinks_user on public.backlinks(user_id);
create index idx_backlinks_site on public.backlinks(client_site_id);
create index idx_backlinks_status on public.backlinks(status);

-- ============================================
-- KEYWORDS
-- ============================================
create table public.keywords (
  id uuid primary key default uuid_generate_v4(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  keyword text not null,
  position_current integer,
  position_previous integer,
  position_history jsonb not null default '[]',
  search_volume integer not null default 0,
  cpc numeric(6,2) not null default 0,
  difficulty integer not null default 0,
  best_page_url text,
  in_top_10 boolean not null default false,
  source text not null default 'dataforseo' check (source in ('gsc', 'dataforseo')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_keywords_site on public.keywords(client_site_id);

-- ============================================
-- ARTICLES
-- ============================================
create table public.articles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  keyword text not null,
  title text,
  content text,
  meta_description text,
  word_count integer not null default 0,
  content_score integer not null default 0,
  serp_analysis jsonb,
  nlp_terms jsonb,
  status text not null default 'draft' check (status in ('draft', 'optimizing', 'ready', 'published', 'scheduled')),
  wp_post_id integer,
  published_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  credits_used integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_articles_user on public.articles(user_id);

-- ============================================
-- AI VISIBILITY CHECKS
-- ============================================
create table public.ai_visibility_checks (
  id uuid primary key default uuid_generate_v4(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  platform text not null check (platform in ('chatgpt', 'perplexity', 'google_aio', 'gemini')),
  query text not null,
  cited boolean not null default false,
  citation_url text,
  citation_snippet text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  competitor_cited text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_ai_visibility_site on public.ai_visibility_checks(client_site_id);

-- ============================================
-- COMPETITORS
-- ============================================
create table public.competitors (
  id uuid primary key default uuid_generate_v4(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  domain text not null,
  da integer not null default 0,
  detected_automatically boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- ACHIEVEMENTS (gamification)
-- ============================================
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_type text not null,
  label text not null,
  description text,
  icon text,
  unlocked_at timestamptz not null default now(),
  notified boolean not null default false,
  unique(user_id, achievement_type)
);

create index idx_achievements_user on public.achievements(user_id);

-- ============================================
-- CRM RESELLER CLIENTS
-- ============================================
create table public.reseller_clients (
  id uuid primary key default uuid_generate_v4(),
  reseller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  client_site_id uuid references public.client_sites(id),
  monthly_charge numeric(8,2) not null default 0,
  report_token uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reseller_clients on public.reseller_clients(reseller_id);
create unique index idx_report_token on public.reseller_clients(report_token);

-- ============================================
-- SUPPORT (WhatsApp conversations)
-- ============================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  whatsapp_number text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'escalated')),
  assigned_to uuid references public.profiles(id),
  channel text not null default 'platform' check (channel in ('whatsapp', 'platform')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent', 'retention')),
  tags text[] not null default '{}',
  started_at timestamptz not null default now(),
  first_response_at timestamptz,
  resolved_at timestamptz,
  csat_rating integer check (csat_rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index idx_conversations_client on public.conversations(client_id);
create index idx_conversations_status on public.conversations(status);

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('client', 'bot', 'staff')),
  sender_id uuid references public.profiles(id),
  content text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

create index idx_messages_conversation on public.messages(conversation_id);

-- ============================================
-- REPORTS
-- ============================================
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  type text not null check (type in ('weekly', 'monthly')),
  data jsonb not null default '{}',
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================
-- CREDIT TRANSACTIONS
-- ============================================
create table public.credit_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null, -- positive = addition, negative = usage
  action text not null,
  reference_id uuid,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index idx_credits_user on public.credit_transactions(user_id);

-- ============================================
-- SITE AUDITS
-- ============================================
create table public.site_audits (
  id uuid primary key default uuid_generate_v4(),
  client_site_id uuid not null references public.client_sites(id) on delete cascade,
  score integer not null default 0,
  issues jsonb not null default '[]',
  schemas_generated jsonb,
  audited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ============================================
-- CLUB (live analysis sessions)
-- ============================================
create table public.club_sessions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'completed')),
  max_slots integer not null default 5,
  replay_url text,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

create table public.club_candidates (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.club_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_site_id uuid not null references public.client_sites(id),
  goal text,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.club_replays (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.club_sessions(id) on delete cascade,
  title text not null,
  site_analyzed text,
  niche text,
  duration text,
  video_url text,
  highlights text[],
  views integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  data jsonb,
  read boolean not null default false,
  channel text not null default 'platform' check (channel in ('platform', 'email', 'whatsapp')),
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, read);

-- ============================================
-- EVENT LOGS
-- ============================================
create table public.event_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  event_type text not null,
  details jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index idx_event_logs_type on public.event_logs(event_type);
create index idx_event_logs_created on public.event_logs(created_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.client_sites enable row level security;
alter table public.backlinks enable row level security;
alter table public.keywords enable row level security;
alter table public.articles enable row level security;
alter table public.ai_visibility_checks enable row level security;
alter table public.competitors enable row level security;
alter table public.achievements enable row level security;
alter table public.reseller_clients enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.site_audits enable row level security;
alter table public.club_candidates enable row level security;
alter table public.notifications enable row level security;

-- Plans: public read
create policy "Plans are viewable by everyone" on public.plans for select using (true);

-- Profiles: users can read/update their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
-- Admin can view all
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Client sites: users see their own
create policy "Users see own sites" on public.client_sites for select using (auth.uid() = user_id);
create policy "Users insert own sites" on public.client_sites for insert with check (auth.uid() = user_id);
create policy "Users update own sites" on public.client_sites for update using (auth.uid() = user_id);
create policy "Users delete own sites" on public.client_sites for delete using (auth.uid() = user_id);

-- Network sites: public read (for matching)
alter table public.network_sites enable row level security;
create policy "Network sites are readable" on public.network_sites for select using (true);

-- Niche contexts: public read
alter table public.niche_contexts enable row level security;
create policy "Niche contexts are readable" on public.niche_contexts for select using (true);

-- Backlinks: users see their own
create policy "Users see own backlinks" on public.backlinks for select using (auth.uid() = user_id);
create policy "Users insert own backlinks" on public.backlinks for insert with check (auth.uid() = user_id);

-- Keywords: users see via their sites
create policy "Users see own keywords" on public.keywords for select using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

-- Articles: users see their own
create policy "Users see own articles" on public.articles for select using (auth.uid() = user_id);
create policy "Users manage own articles" on public.articles for insert with check (auth.uid() = user_id);
create policy "Users update own articles" on public.articles for update using (auth.uid() = user_id);
create policy "Users delete own articles" on public.articles for delete using (auth.uid() = user_id);

-- AI visibility: users see via their sites
create policy "Users see own ai checks" on public.ai_visibility_checks for select using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

-- Competitors: users see via their sites
create policy "Users see own competitors" on public.competitors for select using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

-- Achievements: users see their own
create policy "Users see own achievements" on public.achievements for select using (auth.uid() = user_id);

-- Reseller clients: resellers see their own clients
create policy "Resellers see own clients" on public.reseller_clients for select using (auth.uid() = reseller_id);
create policy "Resellers manage own clients" on public.reseller_clients for insert with check (auth.uid() = reseller_id);
create policy "Resellers update own clients" on public.reseller_clients for update using (auth.uid() = reseller_id);
create policy "Resellers delete own clients" on public.reseller_clients for delete using (auth.uid() = reseller_id);

-- Conversations: users see their own
create policy "Users see own conversations" on public.conversations for select using (auth.uid() = client_id);
create policy "Users create own conversations" on public.conversations for insert with check (auth.uid() = client_id);

-- Messages: users see messages from their conversations
create policy "Users see own messages" on public.messages for select using (
  exists (select 1 from public.conversations where id = conversation_id and client_id = auth.uid())
);
create policy "Users send own messages" on public.messages for insert with check (
  exists (select 1 from public.conversations where id = conversation_id and client_id = auth.uid())
);

-- Reports: users see their own
create policy "Users see own reports" on public.reports for select using (auth.uid() = user_id);

-- Credits: users see their own
create policy "Users see own credits" on public.credit_transactions for select using (auth.uid() = user_id);

-- Site audits: users see via their sites
create policy "Users see own audits" on public.site_audits for select using (
  exists (select 1 from public.client_sites where id = client_site_id and user_id = auth.uid())
);

-- Club candidates: users see their own
create policy "Users see own candidates" on public.club_candidates for select using (auth.uid() = user_id);
create policy "Users submit candidates" on public.club_candidates for insert with check (auth.uid() = user_id);

-- Club sessions and replays: public read
alter table public.club_sessions enable row level security;
create policy "Club sessions are readable" on public.club_sessions for select using (true);
alter table public.club_replays enable row level security;
create policy "Club replays are readable" on public.club_replays for select using (true);

-- Notifications: users see their own
create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

-- Event logs: admin only
create policy "Admins see all logs" on public.event_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.client_sites
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.reseller_clients
  for each row execute function public.handle_updated_at();
