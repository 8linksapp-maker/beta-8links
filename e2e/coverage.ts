/**
 * Test Coverage Matrix — fonte de verdade.
 *
 * Cada Feature representa uma funcionalidade do produto. A matriz é consumida por:
 *  - Tab "Cobertura" em /admin/diagnostics (renderiza a tabela)
 *  - Os próprios testes (podem importar pra garantir que toda feature crítica tem teste)
 *
 * Mantenha em ordem e atualize a cada PR que adicionar/remover feature.
 */

export type Persona = "cliente" | "admin" | "reseller" | "sistema" | "publico";

export type Criticity = "high" | "medium" | "low"; // 🔴 🟡 🟢

/** Estado conhecido da feature (sem relação com pass/fail do último run). */
export type FeatureStatus = "ok" | "bug" | "new" | "unverified" | "orphan";

/** Tipo de teste mais barato que ainda dá garantia. */
export type TestType = "E2E" | "INT" | "UNIT";

export interface Feature {
  id: string;
  label: string;
  page?: string;
  api?: string;
  table?: string;
  persona: Persona;
  criticity: Criticity;
  status: FeatureStatus;
  testType: TestType;
  /** Path relativo do arquivo de teste, quando existe. Vazio = não testado. */
  testFile?: string;
  notes?: string;
}

export const FEATURES: Feature[] = [
  // ─── Cliente (Marina) ───
  { id: "C-001", label: "Login com email/senha", page: "/login", persona: "cliente", criticity: "high", status: "ok", testType: "E2E", testFile: "e2e/flows/01-auth.spec.ts" },
  { id: "C-002", label: "Cadastro novo usuário", page: "/register", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-003", label: "Recuperar senha", page: "/forgot-password", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-004", label: "Listar meus sites", page: "/sites", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-005", label: "Adicionar site novo", page: "/sites/new", persona: "cliente", criticity: "high", status: "ok", testType: "E2E", testFile: "e2e/flows/02-add-site.spec.ts", notes: "Onboarding simplificado: 2 passos (URL + nicho). Sem análise DataForSEO, sem keywords, sem integrações. Cai direto no /dashboard." },
  { id: "C-006", label: "Detalhes do site (DA, métricas)", page: "/sites/[id]", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-007", label: "Editar nicho/voz do site", page: "/sites/[id]", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-008", label: "Deletar site", page: "/sites", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-009", label: "Sincronizar métricas manualmente", page: "/dashboard", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-010", label: "Dashboard principal", page: "/dashboard", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-011", label: "Visualizar usage (créditos/limites)", page: "/dashboard", api: "/api/usage", persona: "cliente", criticity: "high", status: "unverified", testType: "UNIT" },
  { id: "C-012", label: "Listar backlinks solicitados", page: "/backlinks", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-013", label: "Criar backlinks em massa", page: "/backlinks", api: "/api/backlinks/create-batch", persona: "cliente", criticity: "high", status: "ok", testType: "E2E", testFile: "e2e/flows/03-create-backlink.spec.ts" },
  { id: "C-014", label: "Revisar rascunho de backlink", page: "/backlinks/[id]/review", persona: "cliente", criticity: "high", status: "new", testType: "E2E" },
  { id: "C-015", label: "Trocar imagem em artigo de backlink", page: "/backlinks/[id]/review", persona: "cliente", criticity: "medium", status: "new", testType: "E2E", notes: "Recém-implementado via ImageActionDialog. Não replicado em /articles." },
  { id: "C-016", label: "Publicar backlink", page: "/backlinks/[id]/review", api: "/api/admin/publish-post", persona: "cliente", criticity: "high", status: "new", testType: "E2E" },
  { id: "C-017", label: "Estatísticas gerais de backlinks", page: "/backlinks", persona: "cliente", criticity: "medium", status: "unverified", testType: "UNIT" },
  { id: "C-018", label: "Listar artigos gerados", page: "/articles", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-019", label: "Abrir gerador de artigos", page: "/articles/write", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-020", label: "Gerar artigo via IA", page: "/articles/write", api: "/api/generate-article", persona: "cliente", criticity: "high", status: "unverified", testType: "INT" },
  { id: "C-021", label: "Editar título/conteúdo/meta", page: "/articles/[id]/edit", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-022", label: "Publicar artigo no WordPress", page: "/articles/[id]/edit", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-023", label: "Deletar artigo draft", page: "/articles", persona: "cliente", criticity: "low", status: "unverified", testType: "E2E" },
  { id: "C-024", label: "Monitorar rankings (palavras)", page: "/palavras", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-025", label: "Histórico de mudanças (keywords)", page: "/palavras", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-026", label: "Trocar site de contexto", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-027", label: "Planejador de palavras (sugestões)", page: "/palavras", api: "/api/keyword-research", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-028", label: "Visibilidade em IA", page: "/ai-visibility", api: "/api/ai-visibility", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-029", label: "Análise de concorrentes", page: "/competitors", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-030", label: "Auditoria de conteúdo (on-page)", page: "/content-audit", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-031", label: "Mapa tópico", page: "/topical-map", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-032", label: "Painel CRM (sub-contas)", page: "/crm", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-033", label: "Relatórios", page: "/reports", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT", notes: "Possível stub — backend não confirmado" },
  { id: "C-034", label: "Conexão WordPress", page: "/integrations/setup", api: "/api/integrations/save-wordpress", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-035", label: "Conexão Google Search Console", page: "/integrations/setup", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-036", label: "Conexão Google Analytics", page: "/integrations/setup", persona: "cliente", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "C-037", label: "Editar perfil (nome, email)", page: "/settings", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-038", label: "Ver detalhes da assinatura", page: "/settings", persona: "cliente", criticity: "high", status: "unverified", testType: "UNIT" },
  { id: "C-039", label: "Abrir central de suporte", page: "/support", persona: "cliente", criticity: "low", status: "unverified", testType: "E2E" },
  { id: "C-040", label: "Acessar cursos", page: "/courses", persona: "cliente", criticity: "low", status: "unverified", testType: "E2E" },
  { id: "C-041", label: "Onboarding inicial", page: "/onboarding", persona: "cliente", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "C-042", label: "Onboarding completo", page: "/onboarding/full", persona: "cliente", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "C-043", label: "Logout", persona: "cliente", criticity: "high", status: "unverified", testType: "UNIT" },

  // ─── Admin ───
  { id: "A-001", label: "Dashboard admin (KPIs)", page: "/admin", persona: "admin", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "A-002", label: "Listar todos os usuários", page: "/admin/users", persona: "admin", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "A-003", label: "Buscar/filtrar usuários", page: "/admin/users", persona: "admin", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "A-004", label: "Ver perfil de um usuário", page: "/admin/users/[id]", api: "/api/admin/users/[id]", persona: "admin", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "A-005", label: "Criar/atualizar usuário (admin)", api: "/api/admin/users/create", persona: "admin", criticity: "high", status: "unverified", testType: "INT" },
  { id: "A-006", label: "Forçar sync / processar fila", api: "/api/admin/process-backlink", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-007", label: "Listar rede de sites (PBN)", page: "/admin/network", persona: "admin", criticity: "high", status: "unverified", testType: "E2E" },
  { id: "A-008", label: "Adicionar site à rede", page: "/admin/network", persona: "admin", criticity: "high", status: "unverified", testType: "INT" },
  { id: "A-009", label: "Editar site da rede", page: "/admin/network", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-010", label: "Remover site da rede", page: "/admin/network", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-011", label: "Ver filas de processamento", page: "/admin/queues", persona: "admin", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "A-012", label: "Manual retry de fila", page: "/admin/queues", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-013", label: "Atualizar métricas da rede (Moz/DA)", api: "/api/admin/update-network-metrics", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-014", label: "Saúde de APIs (status dashboard)", page: "/admin/monitor", persona: "admin", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "A-015", label: "Painel de logs (auditoria)", page: "/admin/logs", persona: "admin", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "A-016", label: "Painel de suporte (tickets)", page: "/admin/support", persona: "admin", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "A-017", label: "Responder ticket", page: "/admin/support", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-018", label: "Sentry test endpoint", api: "/api/admin/sentry-test", persona: "admin", criticity: "low", status: "unverified", testType: "UNIT" },
  { id: "A-019", label: "Excluir post da rede", api: "/api/admin/delete-post", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-020", label: "Planejar conteúdo (todos sites)", api: "/api/admin/plan-all-sites", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-021", label: "Auto-artigo (bulk)", api: "/api/admin/auto-article", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "A-022", label: "Find image (Unsplash/Pexels)", api: "/api/admin/find-image", persona: "admin", criticity: "medium", status: "new", testType: "INT", notes: "Plugado no editor de backlinks via ImageActionDialog" },
  { id: "A-023", label: "Scrape network (DA/metrics)", api: "/api/admin/scrape-network", persona: "admin", criticity: "medium", status: "unverified", testType: "INT" },

  // ─── Reseller ───
  { id: "R-001", label: "Acessar CRM próprio", page: "/crm", persona: "reseller", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "R-002", label: "Criar sub-conta de cliente", page: "/crm", persona: "reseller", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "R-003", label: "Listar clientes do reseller", page: "/crm", persona: "reseller", criticity: "medium", status: "unverified", testType: "E2E" },
  { id: "R-004", label: "Ver uso de um cliente", page: "/crm", persona: "reseller", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "R-005", label: "Gerenciar limites do cliente", page: "/crm", persona: "reseller", criticity: "medium", status: "unverified", testType: "INT" },

  // ─── Sistema (webhooks, cron, processamento) ───
  { id: "S-001", label: "Webhook Stripe — checkout completo", api: "/api/webhooks/stripe", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-002", label: "Webhook Stripe — subscription.updated", api: "/api/webhooks/stripe", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-003", label: "Webhook Stripe — subscription.deleted", api: "/api/webhooks/stripe", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-004", label: "Webhook Kiwify (pagamento)", api: "/api/webhooks/kiwify", persona: "sistema", criticity: "high", status: "bug", testType: "INT", notes: "STUB — só faz console.log, não atualiza profile" },
  { id: "S-005", label: "Webhook WhatsApp", api: "/api/webhooks/whatsapp", persona: "sistema", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "S-006", label: "Process backlink (gerar artigo)", api: "/api/admin/process-backlink", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-007", label: "Publish post (publicar na rede)", api: "/api/admin/publish-post", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-008", label: "Sincronizar GSC do site", api: "/api/sites/[id]/sync-metrics", persona: "sistema", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "S-009", label: "Detectar nicho automático", api: "/api/sites/[id]/detect-niche", persona: "sistema", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "S-010", label: "OAuth callback Google", api: "/api/auth/google/callback", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "S-011", label: "OAuth callback GitHub", api: "/api/auth/github/callback", persona: "sistema", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "S-012", label: "Quick reset (dev)", api: "/api/auth/quick-reset", persona: "sistema", criticity: "low", status: "unverified", testType: "INT" },
  { id: "S-013", label: "Realtime: atualizar fila", persona: "sistema", criticity: "medium", status: "unverified", testType: "INT" },
  { id: "S-014", label: "RLS — políticas user-scoped", persona: "sistema", criticity: "high", status: "unverified", testType: "INT" },
  { id: "F-005", label: "Anchor diversity (planAnchors)", persona: "sistema", criticity: "high", status: "ok", testType: "UNIT", notes: "Lógica pura em src/lib/anchors.ts. Validada indiretamente em e2e/flows/03-create-backlink.spec.ts" },

  // ─── Público / Auth ───
  { id: "P-001", label: "Landing page", page: "/", persona: "publico", criticity: "low", status: "unverified", testType: "E2E" },
  { id: "P-002", label: "Página de preços", page: "/pricing", persona: "publico", criticity: "low", status: "unverified", testType: "E2E" },
  { id: "P-003", label: "Checkout (criar session Stripe)", api: "/api/create-checkout", persona: "publico", criticity: "high", status: "unverified", testType: "INT" },
  { id: "P-004", label: "Lead magnet (verificador de nicho)", persona: "publico", criticity: "low", status: "unverified", testType: "INT" },
  { id: "P-005", label: "Home de site da rede", page: "/s/[domain]", persona: "publico", criticity: "high", status: "new", testType: "E2E", notes: "Bug crítico (P0) corrigido: rota lia do Supabase do APP em vez da REDE → notFound em todo post + middleware bloqueava /s/* como rota privada → 307 pra /login. Sem isso o backlink não tem destino real." },
  { id: "P-006", label: "Artigo público (backlink)", page: "/s/[domain]/[slug]", persona: "publico", criticity: "high", status: "new", testType: "E2E", notes: "Mesmo fix do P-005 — rota lia do Supabase errado. Sem isso, todo backlink publicado redireciona pra home do domínio." },
  { id: "P-007", label: "API pública de artigos", api: "/api/public/articles", persona: "publico", criticity: "low", status: "unverified", testType: "INT" },
];

// ─────────────────────────────────────────────────────────────────────
// HELPERS PRA UI
// ─────────────────────────────────────────────────────────────────────

export function coverageStats(features: Feature[] = FEATURES) {
  const total = features.length;
  const tested = features.filter(f => !!f.testFile).length;
  const high = features.filter(f => f.criticity === "high").length;
  const highTested = features.filter(f => f.criticity === "high" && !!f.testFile).length;
  const medium = features.filter(f => f.criticity === "medium").length;
  const low = features.filter(f => f.criticity === "low").length;
  const bugs = features.filter(f => f.status === "bug").length;
  return {
    total,
    tested,
    high,
    highTested,
    medium,
    low,
    bugs,
    pctTested: total ? Math.round((tested / total) * 100) : 0,
    pctHighTested: high ? Math.round((highTested / high) * 100) : 0,
  };
}

export const PERSONA_LABEL: Record<Persona, string> = {
  cliente: "Cliente",
  admin: "Admin",
  reseller: "Reseller",
  sistema: "Sistema",
  publico: "Público",
};

export const STATUS_LABEL: Record<FeatureStatus, string> = {
  ok: "OK",
  bug: "Bug aberto",
  new: "Recém-mexido",
  unverified: "Não verificado",
  orphan: "Órfã",
};

export const CRITICITY_LABEL: Record<Criticity, string> = {
  high: "🔴 Crítica",
  medium: "🟡 Média",
  low: "🟢 Baixa",
};
