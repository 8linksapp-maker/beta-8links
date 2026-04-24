# 8links — Arquitetura do Sistema

## Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn UI + Motion (Framer Motion v12)
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **APIs**: DataForSEO, OpenAI, Moz (RapidAPI), Unsplash, Pexels
- **Auth**: Google OAuth + GitHub OAuth via Supabase
- **Payments**: Stripe + Kiwify

## Estrutura de pastas principal
```
src/
├── app/
│   ├── (admin)/admin/         → Painel admin (content-planner, network, users)
│   ├── (dashboard)/           → App principal (dashboard, keywords, backlinks, etc)
│   ├── (public)/              → Páginas públicas (pricing, verificar-nicho)
│   └── api/                   → 38 API routes
├── components/
│   ├── layout/                → Sidebar, TopBar, CommandPalette
│   └── ui/                    → Shadcn components customizados
├── lib/
│   ├── apis/                  → Wrappers de APIs externas
│   ├── actions/               → Server actions
│   ├── hooks/                 → useSite, useUser
│   └── supabase/              → Client, server, middleware
└── KB/                        → Knowledge base (este diretório)
```

## Fluxo de dados principal

### Onboarding
```
URL → Google OAuth → GSC/GA select → Scrape site → GPT classifica
→ DataForSEO (DA + backlinks + keywords) → Moz DA → Salva no banco
```

### Dashboard
```
useSite() → activeSiteId → Supabase queries paralelas
→ GSC live (keywords, cliques) → GA live (sessões)
→ external_backlinks (cache) → backlinks (criados)
```

### Criação de Backlink
```
Usuário clica "+ Backlink" → Escolhe site da rede → Confirma
→ Salva no backlinks (status: queued)
→ process-backlink: pega content_calendar → GPT escolhe keyword
→ test-article: SERP → outline → artigo → imagens
→ Status: published
```

### Geração de Conteúdo
```
Keyword → DataForSEO SERP (top 5 URLs) → Scrape headings
→ GPT-4.1-mini consolida outline → GPT-5.4-nano escreve artigo
→ find-image (banco → Unsplash → Pexels → Vision tags)
→ Artigo com imagens e backlink inserido
```

## Tabelas do banco (11 migrations)

| Tabela | Descrição |
|--------|-----------|
| profiles | Usuários, role, plano, onboarding_completed |
| client_sites | Sites dos clientes, integrações, contexto |
| network_sites | Rede de 67 sites, DA, contexto, categorias |
| keywords | Keywords monitoradas (GSC + DataForSEO) |
| backlinks | Backlinks criados pelo 8links (fila de processamento) |
| external_backlinks | Cache de backlinks externos (DataForSEO) |
| content_calendar | Keywords planejadas por site da rede |
| image_bank | Imagens cacheadas (Unsplash/Pexels + Vision tags) |
| articles | Artigos gerados |
| competitors | Concorrentes detectados |
| plans | Planos (starter, pro, agency) |

## Contexto global
- `SiteProvider` (`useSite()`) — site ativo + lista de sites, persiste no localStorage
- `useUser()` — perfil do usuário autenticado
- Seletor de site na TopBar — todas as páginas reagem à mudança
