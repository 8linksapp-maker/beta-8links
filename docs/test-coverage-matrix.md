# Test Coverage Matrix — 8links

> Inventário gerado em 2026-05-07. Atualizar a cada PR que mexe com feature.
> **Status: PRIMEIRO RASCUNHO — precisa validação humana.** Vários ✅ foram inferidos a partir da existência do código, não de testes manuais. Marque ❓ ou 🐛 onde estiver errado.

## Sumário

- Total de features: **87**
- 🔴 Críticas: 22 (25%)
- 🟡 Médias: 38 (44%)
- 🟢 Baixas: 27 (31%)
- Testadas hoje: 0 (0%)
- Bugs abertos detectados: 2

Status legend: ✅ OK conhecido · 🐛 BUG aberto · 🆕 RECÉM-MEXIDO · ❓ NÃO-VERIFICADO · 💀 ÓRFÃ

---

## Cliente (Marina)

| ID | Funcionalidade | Página | API/Action | Tabela DB | Crit | Status | 1º teste |
|----|---|---|---|---|---|---|---|
| C-001 | Login com email/senha | `/login` | `signIn()` | `profiles` | 🔴 | ❓ | E2E |
| C-002 | Cadastro novo usuário | `/register` | `signUp()` | `profiles` | 🔴 | ❓ | E2E |
| C-003 | Recuperar senha | `/forgot-password` → `/reset-password` | `resetPassword()` | `profiles` | 🔴 | ❓ | E2E |
| C-004 | Listar meus sites | `/sites` | `getSites()` | `client_sites` | 🔴 | ❓ | E2E |
| C-005 | Adicionar site novo | `/sites/new` + `/sites` [botão] | `addSite()` | `client_sites` | 🔴 | 🐛 past_due | E2E |
| C-006 | Detalhes do site (DA, métricas, gráficos) | `/sites/[id]` | `getSites()`, `/api/gsc-data`, `/api/ga-data` | `client_sites`, `keywords` | 🔴 | ❓ | E2E |
| C-007 | Editar nicho/voz do site | `/sites/[id]` [inline edit] | `updateSite()` | `client_sites` | 🟡 | ❓ | E2E |
| C-008 | Deletar site | `/sites` [botão context] | `deleteSite()` | `client_sites` + RLS cascade | 🔴 | ❓ | E2E |
| C-009 | Sincronizar métricas manualmente | `/dashboard` [botão] | `syncSiteMetrics()` | `client_sites`, `keywords` | 🟡 | ❓ | INT |
| C-010 | Dashboard principal | `/dashboard` | `getSites()`, GET `/api/usage` | `client_sites`, `keywords`, `usage_tracking` | 🔴 | ❓ | E2E |
| C-011 | Visualizar usage (créditos/limites) | `/dashboard` [card] | GET `/api/usage` | `usage_tracking`, `plans` | 🔴 | ❓ | UNIT |
| C-012 | Listar backlinks solicitados | `/backlinks` | `getBacklinks()` | `backlinks` | 🔴 | ❓ | E2E |
| C-013 | Solicitar novo backlink (em massa) | `/backlinks` [botão] | POST `/api/backlinks/create-batch` | `backlinks`, `usage_tracking` | 🔴 | 🆕 | E2E |
| C-014 | Revisar rascunho backlink | `/backlinks/[id]/review` | `getBacklinks()` (read), PUT não expostos | `backlinks` | 🔴 | 🆕 | E2E |
| C-015 | Trocar imagem em artigo de backlink | `/backlinks/[id]/review` [ImageActionDialog] | `<ImageActionDialog>` client action | `backlinks` | 🟡 | 🆕 | E2E |
| C-016 | Aprovar/publicar backlink | `/backlinks/[id]/review` [botão Publicar] | POST `/api/admin/publish-post` | `backlinks` | 🔴 | 🆕 | E2E |
| C-017 | Ver estatísticas gerais de backlinks | `/backlinks` [card summary] | `getBacklinkStats()` | `backlinks` | 🟡 | ❓ | UNIT |
| C-018 | Listar artigos gerados | `/articles` | `getArticles()` | `articles` | 🔴 | ❓ | E2E |
| C-019 | Abrir gerador de artigos | `/articles/write` | form client-side | `articles` | 🔴 | ❓ | E2E |
| C-020 | Gerar artigo via IA | `/articles/write` [botão Gerar] | POST `/api/generate-article` | `articles`, `usage_tracking` | 🔴 | ❓ | INT |
| C-021 | Editar título/conteúdo/meta | `/articles/[id]/edit` | `updateArticle()` | `articles` | 🟡 | ❓ | E2E |
| C-022 | Publicar artigo no WordPress | `/articles/[id]/edit` [botão Publicar] | `publishToWordPress()` | `articles` | 🟡 | ❓ | INT |
| C-023 | Deletar artigo draft | `/articles` [context] | soft-delete via action | `articles` | 🟢 | ❓ | E2E |
| C-024 | Monitorar rankings (keywords) | `/palavras` | `getKeywords()`, GET `/api/serp-analysis` | `keywords` | 🔴 | ❓ | E2E |
| C-025 | Ver histórico de mudanças (keywords) | `/palavras` [aba] | query histórico | `keywords` | 🟡 | ❓ | E2E |
| C-026 | Trocar site de contexto | `topbar` [seletor] | setState no layout | `keywords` | 🟡 | ❓ | E2E |
| C-027 | Planejador de palavras (sugestões) | `/palavras` [aba Buscar] | POST `/api/keyword-research` | `keywords` (read) | 🟡 | ❓ | INT |
| C-028 | Visibilidade em IA (ChatGPT/Perplexity) | `/ai-visibility` | POST `/api/ai-visibility` | `client_sites` (read) | 🟡 | ❓ | INT |
| C-029 | Análise de concorrentes | `/competitors` | POST `/api/serp-analysis`, `/api/keyword-research` | `keywords`, `network_sites` | 🟡 | ❓ | INT |
| C-030 | Auditoria de conteúdo (on-page) | `/content-audit` | POST `/api/analyze-site` | `client_sites` | 🟡 | ❓ | INT |
| C-031 | Mapa tópico (cluster sugestão) | `/topical-map` | POST `/api/keyword-research` | `keywords` | 🟡 | ❓ | INT |
| C-032 | Painel CRM (sub-contas reseller) | `/crm` | `getAdminStats()` (se agency) | `profiles`, `client_sites` | 🟡 | ❓ | E2E |
| C-033 | Relatórios (config + download) | `/reports` | POST `/api/admin/generate-report` (stub?) | `backlinks`, `keywords`, `articles` | 🟡 | ❓ | INT |
| C-034 | Conexão WordPress | `/integracoes` → `/integrations/setup` | POST `/api/integrations/save-wordpress` | `client_sites` | 🟡 | ❓ | INT |
| C-035 | Conexão Google Search Console | `/integracoes` → setup | POST `/api/integrations/gsc-data` (test) | `client_sites` | 🟡 | ❓ | INT |
| C-036 | Conexão Google Analytics 4 | `/integracoes` → setup | POST `/api/integrations/ga-data` (test) | `client_sites` | 🟡 | ❓ | INT |
| C-037 | Editar perfil (nome, email) | `/settings` | `updateProfile()` | `profiles` | 🟡 | ❓ | E2E |
| C-038 | Ver detalhes da assinatura | `/settings` [subscription card] | GET subscription via Supabase | `profiles` | 🔴 | ❓ | UNIT |
| C-039 | Abrir central de suporte | `/support` | form email / WhatsApp link | `conversations` (create) | 🟢 | ❓ | E2E |
| C-040 | Acessar cursos/treinamentos | `/courses` | link estático para LMS externo | — | 🟢 | ❓ | E2E |
| C-041 | Onboarding inicial (setup rápido) | `/onboarding` | form interativo | `profiles`, `client_sites` | 🔴 | ❓ | E2E |
| C-042 | Onboarding completo (nicho profundo) | `/onboarding/full` | POST `/api/analyze-site` + form | `client_sites` | 🟡 | ❓ | E2E |
| C-043 | Logout | nav botão | `signOut()` | — | 🔴 | ❓ | UNIT |

---

## Admin

| ID | Funcionalidade | Página | API/Action | Tabela DB | Crit | Status | 1º teste |
|----|---|---|---|---|---|---|---|
| A-001 | Dashboard admin (KPIs) | `/admin` | `getAdminStats()` | `profiles`, `backlinks`, `articles` | 🔴 | ❓ | E2E |
| A-002 | Listar todos os usuários | `/admin/users` | `getAllUsers()` | `profiles` | 🔴 | ❓ | E2E |
| A-003 | Buscar/filtrar usuários | `/admin/users` [search bar] | query dinâmica | `profiles` | 🟡 | ❓ | E2E |
| A-004 | Ver perfil de um usuário | `/admin/users/[id]` | GET `/api/admin/users/[id]` | `profiles`, `client_sites`, `backlinks` | 🔴 | ❓ | E2E |
| A-005 | Criar/atualizar usuário (admin) | `/admin/users` | POST `/api/admin/users/create`, POST `/api/admin/users/update` | `profiles` | 🔴 | ❓ | INT |
| A-006 | Forçar sync de métricas / processar fila | `/admin/users/[id]` [botão] | POST `/api/admin/process-backlink` | `client_sites`, `backlinks` | 🟡 | ❓ | INT |
| A-007 | Listar rede de sites (PBN) | `/admin/network` | query Service Role | `network_sites` | 🔴 | ❓ | E2E |
| A-008 | Adicionar site à rede | `/admin/network` [botão] | insert `network_sites` | `network_sites` | 🔴 | ❓ | INT |
| A-009 | Editar site da rede (nicho, DA) | `/admin/network` [inline/modal] | update `network_sites` | `network_sites` | 🟡 | ❓ | INT |
| A-010 | Remover site da rede | `/admin/network` [delete] | delete `network_sites` | `network_sites` | 🟡 | ❓ | INT |
| A-011 | Ver filas de processamento | `/admin/queues` | query realtime via Supabase | `backlinks`, `articles` | 🟡 | ❓ | E2E |
| A-012 | Desparancar fila (manual retry) | `/admin/queues` [retry] | POST `/api/admin/process-backlink` | `backlinks` | 🟡 | ❓ | INT |
| A-013 | Atualizar métricas da rede (Moz/DA) | trigger interno | POST `/api/admin/update-network-metrics`, `/api/admin/moz-ranks` | `network_sites` | 🟡 | ❓ | INT |
| A-014 | Saúde de APIs (status dashboard) | `/admin/api-monitor` (se existir) | GET `/api/admin/api-monitor` | — | 🟡 | ❓ | E2E |
| A-015 | Painel de logs (auditoria) | `/admin/logs` | query | event log table | 🟡 | ❓ | E2E |
| A-016 | Painel de suporte (tickets) | `/admin/support` | query `conversations` | `conversations` | 🟡 | ❓ | E2E |
| A-017 | Responder ticket (admin) | `/admin/support` [modal] | create reply | `conversations` | 🟡 | ❓ | INT |
| A-018 | Test endpoint Sentry | `/admin/debug` ou similar | GET `/api/admin/sentry-test` | — | 🟢 | ❓ | UNIT |
| A-019 | Excluir post da rede | trigger backstage | POST `/api/admin/delete-post` | `network_posts`, `articles` | 🟡 | ❓ | INT |
| A-020 | Planejador de conteúdo (todos sites) | trigger admin | POST `/api/admin/plan-all-sites`, `/api/admin/plan-content` | content plan | 🟡 | ❓ | INT |
| A-021 | Auto-artigo (bulk) | trigger admin | POST `/api/admin/auto-article`, `/api/admin/test-article` | `articles` | 🟡 | ❓ | INT |
| A-022 | Encontrar imagem (Unsplash/Pexels) | usado pelo editor | POST `/api/admin/find-image` | `image_bank` | 🟡 | 🆕 plugado em backlinks | INT |
| A-023 | Scrape network (DA/metrics) | trigger admin | POST `/api/admin/scrape-network`, `/api/admin/raw-ranks` | `network_sites` | 🟡 | ❓ | INT |

---

## Reseller (Revenda)

| ID | Funcionalidade | Página | API/Action | Tabela DB | Crit | Status | 1º teste |
|----|---|---|---|---|---|---|---|
| R-001 | Acessar CRM próprio | `/crm` | `getAdminStats()` (reseller) | `profiles` (sub-contas) | 🟡 | ❓ | E2E |
| R-002 | Criar sub-conta de cliente | `/crm` [botão] | POST criar profile com role=client | `profiles` | 🟡 | ❓ | INT |
| R-003 | Listar clientes do reseller | `/crm` | query profiles where reseller_id = auth.uid() | `profiles` | 🟡 | ❓ | E2E |
| R-004 | Ver uso de um cliente | `/crm` | query usage_tracking + sites | `usage_tracking`, `client_sites` | 🟡 | ❓ | INT |
| R-005 | Gerenciar limites (créditos/sites) | `/crm` [por cliente] | update profile plan_id | `profiles` | 🟡 | ❓ | INT |

---

## Sistema (webhooks, cron, processamento background)

| ID | Funcionalidade | Trigger | Handler | Tabela DB | Crit | Status | 1º teste |
|----|---|---|---|---|---|---|---|
| S-001 | Webhook Stripe — checkout.session.completed | POST `/api/webhooks/stripe` | atualiza `profiles.subscription_status=active` | `profiles` | 🔴 | ❓ | INT |
| S-002 | Webhook Stripe — customer.subscription.updated | POST `/api/webhooks/stripe` | atualiza status (active/trialing/past_due) | `profiles` | 🔴 | ❓ | INT |
| S-003 | Webhook Stripe — customer.subscription.deleted | POST `/api/webhooks/stripe` | status=canceled | `profiles` | 🔴 | ❓ | INT |
| S-004 | Webhook Kiwify (pagamento aprovado) | POST `/api/webhooks/kiwify` | console.log apenas | `profiles` | 🔴 | 🐛 STUB | INT |
| S-005 | Webhook WhatsApp (mensagem recebida) | POST `/api/webhooks/whatsapp` | cria entry em `conversations` | `conversations` | 🟡 | ❓ | INT |
| S-006 | Cron / on-demand: Processar backlink | POST `/api/admin/process-backlink` | gera artigo, prepara publicação | `backlinks`, `articles` | 🔴 | ❓ | INT |
| S-007 | Cron / on-demand: Publicar post | POST `/api/admin/publish-post` | publica em network_sites/WP | `articles`, `backlinks`, `network_posts` | 🔴 | ❓ | INT |
| S-008 | Cron: Sincronizar GSC | trigger interno | POST `/api/sites/[id]/sync-metrics` | `client_sites`, `keywords` | 🟡 | ❓ | INT |
| S-009 | Cron: Detectar nicho automático | trigger interno | POST `/api/sites/[id]/detect-niche` | `client_sites` | 🟡 | ❓ | INT |
| S-010 | OAuth callback Google | redirect | GET `/api/auth/google/callback` | `client_sites` | 🔴 | ❓ | INT |
| S-011 | OAuth callback GitHub | redirect | GET `/api/auth/github/callback` | `client_sites` | 🟡 | ❓ | INT |
| S-012 | Quick reset (admin/dev only) | POST `/api/auth/quick-reset` | reseta dados de teste | múltiplas | 🟢 | ❓ | INT |
| S-013 | Realtime: Atualizar fila em tempo real | Supabase Realtime channel | broadcast changes | `backlinks` | 🟡 | ❓ | INT |
| S-014 | RLS policies em todas as tabelas user-scoped | trigger DB | enforce auth.uid() = user_id | múltiplas | 🔴 | ❓ | INT |

---

## Público / Auth

| ID | Funcionalidade | Página | API/Action | Tabela DB | Crit | Status | 1º teste |
|----|---|---|---|---|---|---|---|
| P-001 | Landing page | `/` | — | — | 🟢 | ❓ | E2E |
| P-002 | Página de preços | `/pricing` | constantes locais | `plans` | 🟢 | ❓ | E2E |
| P-003 | Checkout (criar session Stripe) | `/checkout` | POST `/api/create-checkout` | `profiles` | 🔴 | ❓ | INT |
| P-004 | Lead magnet (verificador de nicho) | `/verificar-nicho` (?) | POST `/api/analyze-site` | — | 🟢 | ❓ | INT |
| P-005 | Home de site da rede | `/s/[domain]` | query `network_sites`, render artigos | `network_sites`, `network_posts` | 🟢 | ❓ | E2E |
| P-006 | Artigo público (backlink) | `/s/[domain]/[slug]` | query, render conteúdo | `network_posts` | 🟢 | ❓ | E2E |
| P-007 | API pública de artigos (RSS/JSON) | trigger externo | GET `/api/public/articles` | `network_posts` | 🟢 | ❓ | INT |

---

## Features suspeitas / órfãs

1. **`/api/admin/plan-content`** — Existe handler, mas UI que dispara não confirmada.
2. **`/reports`** — Página existe, geração PDF não localizada. Stub provável.
3. **`/admin/automation`** — Mencionada em alguma navegação mas handler não claro.
4. **`achievements` (gamificação)** — Constantes definidas em `lib/constants.ts`, mas triggers de unlock não vistos. Tabela existe?
5. **`/debug`** — Página dev. Marcar pra remoção em produção.
6. **`<ImageActionDialog>` duplicado em potencial** — `/articles/[id]/edit` e `/articles/write` ainda usam `prompt()` + `execCommand`. Pendente replicar fix do `/backlinks/[id]/review`.
7. **`GET /api/usage`** — Cálculo pode estar fora de sincronia com `profile.credits_balance`. Race condition possível em alta concorrência.

---

## Plano em ondas

### Onda 1 — 🔴 Críticas (escrever primeiro)
**~22 testes = 15 E2E + 5 INT + 2 UNIT**

**Auth + Onboarding:**
- C-001, C-002, C-003 (login/signup/password reset)
- C-041 (onboarding rápido)
- C-010 (dashboard principal)

**Site Management:**
- C-004, C-005 (listar/adicionar sites — **inclui caso `past_due`**)
- C-006 (detalhes do site)
- C-008 (deletar site)

**Monetização (Stripe):**
- P-003 (checkout)
- S-001, S-002, S-003 (webhooks Stripe)

**Core SEO:**
- C-012, C-013, C-014, C-016 (backlinks: listar, criar em massa, revisar, publicar)
- C-018, C-019, C-020 (artigos: listar, abrir, gerar)
- C-024 (rankings/keywords)

**Admin:**
- A-001, A-002, A-004 (dashboard/usuários)
- A-007, A-008 (rede de sites)

**Sistema:**
- S-006, S-007 (process-backlink + publish-post end-to-end)
- S-014 (RLS basic check)

### Onda 2 — 🟡 Médias (semanas 2-3)
**~38 testes**

- C-021, C-022 (editar/publicar artigo)
- C-015 (trocar imagem em backlink — recém-mexido)
- C-027, C-028, C-029, C-030, C-031 (keywords avançado, IA, competitors, auditoria, topical map)
- C-034, C-035, C-036 (WordPress, GSC, GA)
- R-001 a R-005 (CRM/reseller)
- A-003, A-005, A-006, A-009 a A-013 (admin operacional)
- S-005 (WhatsApp), S-008, S-009, S-010, S-011 (sync, OAuth)
- A-022 (find-image)

### Onda 3 — 🟡 Administrativas
**~10 testes**

- A-014, A-015, A-016, A-017 (monitor, logs, support)
- C-037, C-038, C-039 (settings cliente)
- A-019, A-020, A-021, A-023 (admin avançado)
- S-013 (realtime)

### Onda 4 — 🟢 (opcional)
- C-040, C-042, C-043 (cursos, onboarding completo, logout)
- C-023, C-033 (delete draft, reports)
- A-018 (sentry test)
- S-012 (quick-reset)
- P-001, P-002, P-004, P-005, P-006, P-007 (landing, pricing, sites públicos)

---

## Bugs conhecidos confirmados

1. 🐛 **C-005: Botão "Adicionar site" desativado silenciosamente** — `subscription_status=past_due` deixa o botão `disabled`, cliente clica e nada acontece, sem toast.
   - **Impacto:** confusão, suporte recebe ticket.
   - **Fix:** mostrar tooltip ou aceitar `past_due` na adição.

2. 🐛 **S-004: Webhook Kiwify é stub** — `/api/webhooks/kiwify` só faz `console.log()`, não atualiza profile.
   - **Impacto:** cliente paga via Kiwify, transação completa, mas continua sem acesso.
   - **Fix:** implementar lógica equivalente ao Stripe.

---

## Notas observacionais

1. **Padrão de Image Editing**: `<ImageActionDialog>` plugado só em `/backlinks/[id]/review`. `/articles/[id]/edit` e `/articles/write` ainda usam `prompt()` + `document.execCommand`. Replicar.
2. **Permission gates inconsistentes**: Admin usa `profile.role === 'admin'`, Reseller usa `plan_id === 'agency'`. Considerar normalizar.
3. **Realtime vs. Polling**: Filas (`/admin/queues`) usam Realtime (bom), mas `/sites/[id]` parece usar polling. UX inconsistente.
4. **Audit logging**: Mencionado como feature, mas trigger de DB ou middleware não claro.
5. **Contagem de créditos**: Race condition possível em `usage_tracking` + `profile.credits_balance` em concorrência alta.
6. **WordPress sync após publicar**: UI não monitora se WP rejeitou silenciosamente.
7. **`/sites/[id]` paralelismo**: GSC + GA disparados em paralelo, sem fallback visual em falha.
8. **Service Role em `/api/admin/*`**: funciona, mas sem audit log próprio. Considerar.
9. **Estado dos backlinks**: transições não documentadas (queued → processing → ready_for_review → published?). Pode ter edge cases.
10. **Limite de sites por plano**: lógica existe, mas sem teste de E2E pra "tentar adicionar 6º site no Pro (limit=5)".

---

## Dúvidas pra validar

- A-013 (Moz/Update metrics): cron ativo ou manual?
- C-033 `/reports`: tem backend ou é UI stub?
- `achievements` system: funciona ou tabela órfã?
- `GET /api/usage`: tempo real ou cached?
- `/sites/[id]`: refaz fetch a cada load ou cache?
- `/verificar-nicho` (lead magnet) existe ou é hipotético?
