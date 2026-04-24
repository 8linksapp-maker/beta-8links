# 8links — Estado Atual do Projeto (2026-04-24)

## O que funciona
- ✅ Auth (Supabase + Google OAuth)
- ✅ Onboarding (adicionar site, conectar GSC/GA)
- ✅ Dashboard com KPIs reais (GSC + GA)
- ✅ Keywords page unificada (Oportunidades + Meu Plano + Pesquisar)
- ✅ Keyword research manual (DataForSEO com cache)
- ✅ Keyword discovery automática (GPT + DataForSEO)
- ✅ Sistema de limites por ação (diário/mensal por plano)
- ✅ Backlink creation modal (auto + manual)
- ✅ process-backlink API (keyword selection + article generation)
- ✅ test-article pipeline (SERP → outline → artigo → imagens)
- ✅ Image bank (cache Unsplash/Pexels + Vision tags)
- ✅ Normalize article (pós-processamento GPT)
- ✅ Editor Surfer-like (contentEditable + scoring + NLP terms)
- ✅ Moz DA real (RapidAPI)
- ✅ Usage tracking (usage_tracking table)
- ✅ Nav unificado (Keywords no menu, keyword-planner redireciona)
- ✅ Top bar com indicadores de uso

## O que NÃO funciona / falta
- ❌ Publicação real dos artigos nos sites da rede
- ❌ Retry de backlinks com erro
- ❌ Verificação de indexação (status "indexed")
- ❌ WordPress integration
- ❌ Stripe/Kiwify webhooks (pagamento)
- ❌ CRM para revenda
- ❌ Visibilidade IA (ChatGPT, Perplexity monitoring)
- ❌ Relatórios
- ❌ Cursos/Club
- ❌ Suporte bot
- ❌ Cron jobs (keywords, métricas)

## Páginas do app
| Rota | Status | Descrição |
|------|--------|-----------|
| /dashboard | ✅ Real | KPIs, gráficos, feed |
| /sites | ✅ Real | Lista de sites do usuário |
| /sites/new | ✅ Real | Onboarding |
| /keywords | ✅ Real | 3 tabs: Oportunidades, Meu Plano, Pesquisar |
| /keywords/select-site | ✅ Real | Seleção manual de site da rede |
| /backlinks | ✅ Real | Lista de backlinks + status |
| /articles | ⚠️ Parcial | Lista artigos, CRUD básico |
| /articles/write | ✅ Real | Editor Surfer-like com scoring |
| /content-audit | ❌ Mock | Placeholder |
| /topical-map | ❌ Mock | Placeholder |
| /ai-visibility | ❌ Mock | Placeholder |
| /competitors | ❌ Mock | Placeholder |
| /site-health | ❌ Mock | Placeholder |
| /crm | ❌ Mock | Placeholder |
| /reports | ❌ Mock | Placeholder |
| /courses | ❌ Mock | Placeholder |
| /settings | ⚠️ Parcial | Profile, sem billing |
| /support | ❌ Mock | Placeholder |

## Migrations pendentes (rodar no Supabase)
- 012_keyword_suggestions_cache.sql — Cache DataForSEO
- 013_keyword_content_status.sql — content_status + article_url em keywords
- 014_usage_tracking.sql — Tabela de controle de uso

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + Shadcn-style components
- Supabase (PostgreSQL + Auth + Storage)
- DataForSEO (SERP, keywords, backlinks)
- OpenAI GPT-4.1-mini / GPT-5.4-nano (artigos)
- Moz DA via RapidAPI
- Unsplash + Pexels (imagens)
- GPT Vision (tags de imagem)
