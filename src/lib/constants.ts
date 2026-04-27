export const PLANS = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 197,
    billing: "monthly" as const,
    limits: {
      sites: 1,
      backlinksMonthly: 999,          // ilimitado
      keywordSearchesDaily: 10,       // 10 pesquisas/dia
      keywordPlansMonthly: 1,         // 1 descoberta automática/mês
      diagnosticsMonthly: 1,          // 1 diagnóstico/mês
      crmClients: 3,                  // 3 clientes para revenda
      articlesMonthly: 10,            // 10 artigos/mês
    },
    features: {
      wordpress: false,
      crm: false,
      whiteLabel: false,
      aiVisibility: false,
      competitors: 1,
      courses: "basic",
      support: "bot",
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 397,
    billing: "monthly" as const,
    limits: {
      sites: 5,
      backlinksMonthly: 999,          // ilimitado
      keywordSearchesDaily: 10,       // 10 pesquisas/dia
      keywordPlansMonthly: 5,         // 5 descobertas/mês
      diagnosticsMonthly: 5,          // 5 diagnósticos/mês
      crmClients: 10,                 // 10 clientes para revenda
      articlesMonthly: 100,           // 100 artigos/mês
    },
    features: {
      wordpress: true,
      crm: true,
      whiteLabel: false,
      aiVisibility: { platforms: ["chatgpt", "perplexity"], frequency: "weekly", prompts: 50 },
      competitors: 3,
      courses: "all",
      support: "priority",
    },
  },
  agency: {
    id: "agency",
    name: "Legacy",
    price: 997,
    billing: "yearly" as const,
    limits: {
      sites: 999,                     // ilimitado
      backlinksMonthly: 999,          // ilimitado
      keywordSearchesDaily: 20,       // 20 pesquisas/dia
      keywordPlansMonthly: 40,        // 40 descobertas/mês
      diagnosticsMonthly: 999,        // ilimitado
      crmClients: 999,                // ilimitado
      articlesMonthly: 999,           // ilimitado
    },
    features: {
      wordpress: true,
      crm: true,
      whiteLabel: true,
      aiVisibility: { platforms: ["chatgpt", "perplexity", "google_aio", "gemini"], frequency: "daily", prompts: 150 },
      competitors: 10,
      courses: "all",
      support: "dedicated",
      badgeFounder: true,
    },
  },
  lifetime: {
    id: "lifetime",
    name: "Lifetime",
    price: 1997,
    billing: "once" as const,
    limits: {
      sites: 999,                     // ilimitado
      backlinksMonthly: 999,          // ilimitado
      keywordSearchesDaily: 20,       // 20 pesquisas/dia
      keywordPlansMonthly: 40,        // 40 descobertas/mês
      diagnosticsMonthly: 999,        // ilimitado
      crmClients: 999,                // ilimitado
      articlesMonthly: 999,           // ilimitado
    },
    features: {
      wordpress: true,
      crm: true,
      whiteLabel: true,
      aiVisibility: { platforms: ["chatgpt", "perplexity", "google_aio", "gemini"], frequency: "daily", prompts: 150 },
      competitors: 10,
      courses: "all",
      support: "vip",
      badgeFounder: true,
    },
  },
} as const;

/** Usage action types */
export type UsageAction = "keyword_search" | "keyword_plan" | "article" | "diagnostic" | "backlink";

/** Period for each action: daily resets at midnight, monthly resets on 1st */
export const USAGE_PERIOD: Record<UsageAction, "daily" | "monthly"> = {
  keyword_search: "daily",
  keyword_plan: "monthly",
  article: "monthly",
  diagnostic: "monthly",
  backlink: "monthly",
};

/** Map each usage action to the plan limit key it checks against */
export const USAGE_LIMIT_MAP: Record<UsageAction, keyof typeof PLANS.starter.limits> = {
  keyword_search: "keywordSearchesDaily",
  keyword_plan: "keywordPlansMonthly",
  article: "articlesMonthly",
  diagnostic: "diagnosticsMonthly",
  backlink: "backlinksMonthly",
};

export const ACHIEVEMENTS = [
  { type: "first_backlink", label: "Primeiro Backlink", description: "Seu primeiro backlink foi publicado!", icon: "🔗" },
  { type: "da_10", label: "DA 10", description: "Seu site alcançou DA 10!", icon: "📈" },
  { type: "da_20", label: "DA 20", description: "Seu site alcançou DA 20!", icon: "📈" },
  { type: "da_30", label: "DA 30", description: "Autoridade crescendo!", icon: "🚀" },
  { type: "da_50", label: "DA 50", description: "Autoridade alta!", icon: "⭐" },
  { type: "page_1", label: "Página 1!", description: "Primeira keyword na página 1 do Google!", icon: "🏆" },
  { type: "keywords_10", label: "10 Keywords", description: "10 keywords rankeando!", icon: "🔑" },
  { type: "keywords_50", label: "50 Keywords", description: "50 keywords rankeando!", icon: "🔑" },
  { type: "backlinks_100", label: "100 Backlinks", description: "100 backlinks ativos!", icon: "💯" },
] as const;

export const NAV_ITEMS = {
  main: [
    { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
    { href: "/sites", label: "Meus Sites", icon: "Globe" },
    { href: "/keywords", label: "Keywords", icon: "Search" },
    { href: "/backlinks", label: "Backlinks", icon: "Link" },
    { href: "/articles", label: "Artigos IA", icon: "FileText", soon: true },
  ],
  intelligence: [
    { href: "/content-audit", label: "Auditoria", icon: "ClipboardCheck", soon: true },
    { href: "/topical-map", label: "Mapa de Conteúdo", icon: "Map", soon: true },
    { href: "/ai-visibility", label: "Visibilidade IA", icon: "Bot", soon: true },
    { href: "/competitors", label: "Concorrentes", icon: "Users", soon: true },
    { href: "/site-health", label: "Saúde do Site", icon: "HeartPulse", soon: true },
  ],
  business: [
    { href: "/crm", label: "Revenda", icon: "Briefcase", soon: true },
    { href: "/reports", label: "Relatórios", icon: "BarChart3", soon: true },
    { href: "/courses", label: "Club", icon: "Radio", soon: true },
  ],
  bottom: [
    { href: "/support", label: "Suporte", icon: "MessageSquare" },
    { href: "/settings", label: "Configurações", icon: "Settings" },
  ],
} as const;
