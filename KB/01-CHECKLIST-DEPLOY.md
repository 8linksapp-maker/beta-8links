# 8links — Checklist para Deploy em Produção

## ✅ FEITO — Funcionalidades Core

### Onboarding (9 steps)
- [x] URL do site
- [x] Conectar Google Search Console
- [x] Selecionar site GSC
- [x] Selecionar Google Analytics
- [x] Análise automática (scraping + DataForSEO + Moz DA + GSC)
- [x] Contexto do site (GPT resume, usuário confirma)
- [x] Seleção de nicho (GPT sugere, usuário confirma)
- [x] Tom de voz + preferências de conteúdo
- [x] Keywords encontradas (GSC)

### Dashboard
- [x] Seletor de site global (multi-site, persiste no localStorage)
- [x] Card de valor do tráfego orgânico (R$)
- [x] 4 KPIs: DA, Backlinks, Keywords, Cliques
- [x] Gráfico de desempenho (30/60/90 dias)
- [x] Páginas mais acessadas (links clicáveis)
- [x] Feed do Autopilot
- [x] Keywords em movimento (subiu/desceu)
- [x] Oportunidades (quase página 1)
- [x] Backlinks recentes (filtro .com.br/todos)

### Keywords
- [x] Dados reais do GSC (keyword + URL + posição + variação + cliques)
- [x] Filtros por posição (Top 10/20/50/50+)
- [x] Ordenação por posição, variação, cliques, backlinks
- [x] Tooltips explicativos nas colunas
- [x] Botão "+ Backlink" por keyword
- [x] Paginação

### Backlinks
- [x] Tabela de backlinks externos (DataForSEO cached no banco)
- [x] DA, domínio, página de referência, âncora, contexto, URL destino
- [x] Filtros: dofollow/nofollow, busca, ordenação
- [x] Charts: dofollow vs nofollow, distribuição DA, top âncoras
- [x] Seção "Backlinks 8links" com progresso (fila → gerando → publicado)
- [x] Botão "Criar novo backlink" → modal auto/manual
- [x] Preview do artigo gerado

### Criação de Backlinks
- [x] Modo automático (cria + processa em background)
- [x] Modo manual (seleciona site da rede → confirma)
- [x] Página de seleção de sites: domínio blur, match %, DA, backlinks, disponíveis
- [x] Processamento: GPT escolhe keyword → SERP → outline → artigo → imagens
- [x] Toast de progresso em tempo real
- [x] Status automático: queued → generating → published

### Keyword Planner
- [x] Pesquisa de keywords automática (DataForSEO)
- [x] Modal intro explicativo (leigo-friendly)
- [x] Modal de aprovação (selecionar/desmarcar keywords)
- [x] Salvar no banco
- [x] Tabela com busca, ordenação, paginação
- [x] Download HTML

### Geração de Conteúdo (pipeline completo)
- [x] SERP analysis → top 5 concorrentes
- [x] Scrape headings + word count dos concorrentes
- [x] GPT consolida outline (melhor de todos os concorrentes)
- [x] GPT escreve artigo (tamanho = média concorrentes + 25%)
- [x] Parágrafos curtos (max 3 linhas)
- [x] Keyword no título e meta description
- [x] Imagens automáticas (1 a cada 400 palavras)
- [x] Busca: banco → Unsplash → Pexels → Vision descreve → salva
- [x] Backlink inserido naturalmente
- [x] Preview formatado (H1/H2/H3, imagens, links)

### Rede de Sites
- [x] 67 sites cadastrados com contexto GPT
- [x] DA do Moz (real)
- [x] Backlinks do DataForSEO
- [x] Planejamento de conteúdo por site (content_calendar)
- [x] Admin: content-planner com progresso e aprovação

### Integrações
- [x] Google Search Console (OAuth + dados)
- [x] Google Analytics (OAuth + dados)
- [x] GitHub (OAuth + conteúdo de repos Astro)
- [x] WordPress (test + save credentials)
- [x] DataForSEO (backlinks, keywords, SERP)
- [x] OpenAI GPT (classificação, artigos, niche edit)
- [x] Moz DA via RapidAPI
- [x] Unsplash + Pexels (imagens)

### Debug
- [x] Todas as APIs do DataForSEO
- [x] Google (GSC, GA, Properties)
- [x] GitHub (repos, content, tree)
- [x] Geração de artigo (3 modelos)
- [x] Busca de imagem
- [x] Moz DA
- [x] Planejamento de conteúdo
- [x] Preview de artigo formatado

---

## 🔧 PENDENTE — Para deploy em produção

### Prioridade 1 — Bloqueantes

- [ ] **Deploy na Vercel** — Configurar projeto, domínio 8links.com.br, env vars
- [ ] **Supabase produção** — Rodar TODAS as migrations (001-011) no banco de produção
- [ ] **Variáveis de ambiente** — Configurar no Vercel:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
  - GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET
  - DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD
  - OPENAI_API_KEY
  - MOZ_RAPIDAPI_KEY
  - UNSPLASH_ACCESS_KEY
  - PEXELS_API_KEY
  - STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
  - NEXT_PUBLIC_APP_URL (https://8links.com.br)
- [ ] **Google OAuth** — Adicionar https://8links.com.br/api/auth/google/callback como redirect URI
- [ ] **GitHub OAuth** — Adicionar https://8links.com.br/api/auth/github/callback como redirect URI
- [ ] **RLS audit** — Verificar todas as policies do Supabase (algumas tabelas estão com RLS disabled)
- [ ] **Stripe/Kiwify** — Configurar webhooks pra URL de produção
- [ ] **Storage** — Criar bucket "public" no Supabase Storage (pra imagens)

### Prioridade 2 — Funcionalidades pendentes

- [ ] **Publicação de artigos no Supabase** — Sites da rede leem artigos do banco (não de .md)
- [ ] **Cron semanal** — Edge Function: atualizar posições de keywords
- [ ] **Cron mensal** — Edge Function: refresh DA + backlinks + CPC
- [ ] **Score SEO** — Calcular score baseado em DA + keywords top10 + backlinks
- [ ] **Notificações** — "Sua keyword X subiu 5 posições"
- [ ] **Settings** — Página de configurações do site (integrações, nicho, tom de voz)
- [ ] **Relatórios** — PDF/email mensal com progresso real

### Prioridade 3 — Valor agregado

- [ ] **CRM** — Gestão de clientes (revenda) com dados reais
- [ ] **Content Audit** — Análise de conteúdo existente com dados reais
- [ ] **AI Visibility** — Verificar se aparece no AI Overview (funcional)
- [ ] **Topical Map** — Mapa de conteúdo sugerido (funcional)
- [ ] **Cursos** — Conteúdo educacional
- [ ] **WhatsApp** — Notificações via Evolution API

### Prioridade 4 — Polish

- [ ] **Loading states** — Skeletons em todas as páginas
- [ ] **Error handling** — Tratamento de erros em todas as APIs
- [ ] **Mobile** — Testar responsividade completa
- [ ] **Performance** — Otimizar queries do Supabase (indexes, select específico)
- [ ] **SEO do app** — Meta tags, Open Graph
- [ ] **Favicon + PWA** — Ícones e manifest

---

## 📊 Métricas do projeto

- **38 API routes** funcionais
- **41 páginas** (public + dashboard + admin)
- **11 migrations** do banco
- **67 sites** na rede com contexto
- **Pipeline de conteúdo** completo (SERP → outline → artigo → imagens → backlink)
- **Custo por artigo**: ~R$0.03 (GPT-5.4-nano + imagens)
- **Custo por planejamento**: ~R$0.50/site (40 seeds DataForSEO)

---

## 🔑 APIs e custos

| API | Custo | Uso |
|-----|-------|-----|
| DataForSEO Labs | $0.012/task | Keywords research |
| DataForSEO Backlinks | $0.002/task | Backlink analysis |
| DataForSEO SERP | $0.002/task | SERP analysis |
| OpenAI GPT-5.4-nano | ~$0.005/artigo | Geração de conteúdo |
| OpenAI GPT-4.1-mini | ~$0.002/outline | Outline + classificação |
| Moz (RapidAPI) | ~$0.0004/lookup | DA/PA/Spam |
| Unsplash | Grátis (50/hora) | Imagens |
| Pexels | Grátis | Imagens (fallback) |
| Google APIs | Grátis | GSC + GA |
