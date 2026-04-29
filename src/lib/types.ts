export type PlanId = "starter" | "pro" | "agency" | "legacy_monthly" | "legacy" | "lifetime" | "club";

export type UserRole = "client" | "admin";

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "past_due";

export type SitePhase = "planting" | "sprouting" | "growing" | "harvesting";

export type BacklinkStatus = "queued" | "generating" | "published" | "indexed" | "error";

export type AnchorType = "exact" | "partial" | "branded" | "generic" | "url";

export type ArticleStatus = "draft" | "optimizing" | "ready" | "published" | "scheduled";

export type KeywordSource = "gsc" | "dataforseo";

export type AIPlatform = "chatgpt" | "perplexity" | "google_aio" | "gemini";

export type ConversationStatus = "open" | "in_progress" | "resolved" | "escalated";

export type ConversationPriority = "normal" | "urgent" | "retention";

export type AchievementType =
  | "first_backlink" | "da_10" | "da_20" | "da_30" | "da_50"
  | "page_1" | "keywords_10" | "keywords_50"
  | "backlinks_100" | "backlinks_500"
  | "traffic_1k" | "traffic_5k" | "traffic_10k"
  | "first_article" | "articles_10"
  | "streak_3m" | "streak_6m"
  | "ai_cited" | "niche_50" | "first_client";

/** @deprecated Use UsageAction from constants.ts instead */
export type CreditAction = "keyword_search" | "keyword_plan" | "article" | "diagnostic" | "backlink";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  plan_id: PlanId;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  payment_provider: "stripe" | "kiwify" | null;
  credits_balance: number;
  credits_reset_at: string;
  reseller_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientSite {
  id: string;
  user_id: string;
  url: string;
  niche_primary: string | null;
  niche_secondary: string | null;
  da_current: number;
  da_history: Array<{ date: string; value: number }>;
  seo_score: number;
  phase: SitePhase;
  autopilot_active: boolean;
  wp_url: string | null;
  wp_username: string | null;
  ga_property_id: string | null;
  gsc_site_url: string | null;
  brand_voice: {
    name: string;
    tone: string;
    audience: string;
    about: string;
    keywords: string[];
    forbidden_words: string[];
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Backlink {
  id: string;
  user_id: string;
  client_site_id: string;
  network_site_id: string;
  target_url: string;
  anchor_text: string;
  anchor_type: AnchorType;
  article_title: string;
  published_url: string | null;
  status: BacklinkStatus;
  da_at_creation: number;
  created_at: string;
  published_at: string | null;
  indexed_at: string | null;
}

export interface Keyword {
  id: string;
  client_site_id: string;
  keyword: string;
  position_current: number | null;
  position_previous: number | null;
  position_history: Array<{ date: string; position: number }>;
  search_volume: number;
  cpc: number;
  difficulty: number;
  best_page_url: string | null;
  in_top_10: boolean;
  source: KeywordSource;
  last_checked_at: string;
}

export interface Article {
  id: string;
  user_id: string;
  client_site_id: string;
  keyword: string;
  title: string;
  content: string;
  meta_description: string;
  word_count: number;
  content_score: number;
  serp_analysis: Record<string, unknown>;
  nlp_terms: Array<{ term: string; target: number; current: number }>;
  status: ArticleStatus;
  wp_post_id: number | null;
  published_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  credits_used: number;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: AchievementType;
  label: string;
  description: string;
  icon: string;
  unlocked_at: string;
  notified: boolean;
}

export interface Conversation {
  id: string;
  client_id: string;
  whatsapp_number: string;
  status: ConversationStatus;
  assigned_to: string | null;
  priority: ConversationPriority;
  tags: string[];
  started_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  csat_rating: number | null;
}

export interface ResellerClient {
  id: string;
  reseller_id: string;
  name: string;
  email: string;
  phone: string | null;
  client_site_id: string;
  monthly_charge: number;
  report_token: string;
}
