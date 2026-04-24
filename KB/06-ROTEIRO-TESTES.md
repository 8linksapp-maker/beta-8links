# 8links — Roteiro de Testes

## Como testar

Abra cada página e siga o checklist. Marque ✅ se funciona, ❌ se não.

---

## 1. ONBOARDING (testar com site novo)

**URL:** `/onboarding`
**Ação:** Deletar site existente e refazer o onboarding

- [ ] Step 1: Digitar URL do site → "Continuar" cria o site no banco
- [ ] Step 2: Conectar Google → redireciona pro OAuth do Google
- [ ] Step 3: Selecionar site GSC → lista aparece com sites do Search Console
- [ ] Step 4: Selecionar GA4 → lista aparece com propriedades Analytics
- [ ] Step 5: Análise → cards Authority (DA), Backlinks, Páginas aparecem com números reais
- [ ] Step 6: Contexto → GPT resume o site, usuário pode editar, temas detectados
- [ ] Step 7: Nicho → sugestões do GPT aparecem, sem "Geral", pode selecionar/digitar
- [ ] Step 8: Tom de voz → selecionar tom, tipo de conteúdo, público
- [ ] Step 9: Keywords → lista de keywords do GSC com cliques, paginação
- [ ] Final: redireciona pra `/integrations/setup`

**Verificar no banco:**
- `client_sites`: url, niche_primary, da_current, avg_cpc, site_context preenchidos
- `keywords`: keywords salvas com search_volume e position_current
- `profiles`: onboarding_completed = true

---

## 2. DASHBOARD

**URL:** `/dashboard`

- [ ] Seletor de site no header funciona (troca de site)
- [ ] Card "Seu tráfego orgânico vale R$ X" aparece com valor
- [ ] 4 KPIs: DA, Backlinks, Keywords, Cliques — todos com valores
- [ ] Filtro 30d/60d/90d muda o gráfico
- [ ] Gráfico de desempenho carrega (area chart com cliques)
- [ ] Páginas mais acessadas — links clicáveis, abrem em nova aba
- [ ] Feed do Autopilot — mostra backlinks criados
- [ ] Keywords em movimento — subiu (verde) / desceu (vermelho)
- [ ] Oportunidades — keywords #11-20
- [ ] Backlinks recentes — filtro .com.br/Todos funciona

---

## 3. KEYWORDS

**URL:** `/keywords`

- [ ] Carrega keywords do GSC (não do banco local)
- [ ] 4 KPIs: Total, Top 10, Cliques, Posição Média
- [ ] Tabela: Keyword, URL (clicável), Posição, Variação, Cliques, Backlinks
- [ ] Coluna Variação mostra +/- com cores
- [ ] Ordenação funciona (clica no header da coluna)
- [ ] Filtro por posição (Top 10/20/50/50+)
- [ ] Busca por texto funciona
- [ ] Botão "+ Backlink" aparece em keywords com URL
- [ ] Tooltips nas colunas (hover)
- [ ] Paginação funciona

---

## 4. BACKLINKS

**URL:** `/backlinks`

- [ ] 4 KPIs: Total, Domínios Únicos, Dofollow %, DA Médio
- [ ] Seção "Backlinks 8links" — mostra backlinks criados com status
- [ ] Botão "Processar fila" aparece se tem backlinks na fila
- [ ] Polling: status muda automaticamente (a cada 5s)
- [ ] Botão "Ver artigo" abre preview formatado quando publicado
- [ ] Botão "Criar novo backlink" → modal com Auto/Manual
- [ ] Filtro dofollow/nofollow/todos
- [ ] Busca por domínio ou âncora
- [ ] Ordenação por DA e Links
- [ ] Charts: dofollow vs nofollow, distribuição DA, top âncoras
- [ ] Paginação

---

## 5. CRIAR BACKLINK — Modo Manual

**URL:** `/keywords` → "+ Backlink" → "Manual"

- [ ] Redireciona pra `/keywords/select-site`
- [ ] Cards dos sites da rede: domínio blur, match %, DA, Backlinks, Disponíveis
- [ ] Match % calcula corretamente (mesmo nicho = alto)
- [ ] Resumo do GPT aparece no card
- [ ] Ordenação: Match, DA, Links
- [ ] Busca por nicho funciona
- [ ] Ao selecionar: barra sticky aparece no rodapé
- [ ] Botão "Criar backlink aqui" → confirmação → toast
- [ ] Redireciona pra `/backlinks`
- [ ] Backlink aparece na tabela com status "Na fila"
- [ ] Processamento roda em background (toasts de progresso)
- [ ] Status muda automaticamente pra "Publicado"

---

## 6. CRIAR BACKLINK — Modo Automático

**URL:** `/keywords` → "+ Backlink" → "Automático"

- [ ] Cria backlink no banco imediatamente
- [ ] Toast: "Backlink criado — gerando artigo automaticamente..."
- [ ] Modal fecha
- [ ] Backlink aparece em `/backlinks`

---

## 7. KEYWORD PLANNER

**URL:** `/keyword-planner`

- [ ] Estado vazio: "Descubra palavras-chave" com botão
- [ ] Clica "Descobrir keywords" → modal intro com explicação
- [ ] "Começar pesquisa" → loading com progress steps
- [ ] Após 2-3 min: modal de aprovação com keywords
- [ ] Checkboxes funcionam (selecionar/desmarcar)
- [ ] "Todas" / "Nenhuma" funciona
- [ ] Volume e Dificuldade (Fácil/Médio/Difícil) corretos
- [ ] "Salvar X keywords" → salva no banco
- [ ] Tabela aparece com busca, ordenação, paginação
- [ ] Botão "Baixar" gera HTML
- [ ] "Nova pesquisa" abre o modal intro de novo

---

## 8. MEUS SITES

**URL:** `/sites`

- [ ] Lista todos os sites do usuário
- [ ] Cards: DA, Backlinks, Keywords reais
- [ ] Badge "ativo" no site selecionado
- [ ] Clicar no card → seleciona como site ativo + vai pra dashboard
- [ ] Busca por domínio/nicho
- [ ] Botão deletar → confirmação → deleta
- [ ] "Adicionar Site" → vai pra `/sites/new`

---

## 9. SITE DETAIL

**URL:** `/sites/[id]`

- [ ] Header: URL, nicho, autopilot
- [ ] KPIs: Score, DA, Backlinks, Keywords, Sessões
- [ ] Tab Overview: gráfico evolução DA, fase do site
- [ ] Tab Backlinks: tabela com filtros e charts
- [ ] Tab Keywords: keywords com paginação
- [ ] Tab Conteúdo: GitHub articles (se conectado)
- [ ] Tab Integrações: Google, WordPress, GitHub

---

## 10. ADMIN — Content Planner

**URL:** `/admin/content-planner`

- [ ] Lista todos os 67 sites da rede
- [ ] Status: ✅ Planejado / Pendente
- [ ] 4 cards stats: Total, Planejados, Pendentes, Keywords total
- [ ] "Planejar" por site → gera keywords → modal aprovação
- [ ] "Planejar todos" → processa batch com progresso
- [ ] Expandir site → ver keywords salvas com paginação
- [ ] Download HTML

---

## 11. DEBUG

**URL:** `/debug`

- [ ] Campos organizados: consulta (esquerda) + artigo (direita)
- [ ] DataForSEO Raw: todos os endpoints funcionam
- [ ] Google: GSC, GA, Properties
- [ ] GitHub: repos, content, tree
- [ ] Geração de artigo: 3 modelos (nano, mini, 5.4-nano)
- [ ] Auto artigo: escolhe keyword do planejamento + gera
- [ ] Busca de imagem: Unsplash/Pexels + Vision tags
- [ ] Preview: renderiza artigo com H1/H2/H3 e imagens
- [ ] Moz DA: consultar e salvar
- [ ] Planejamento: gera 200 keywords
- [ ] Baixar HTML

---

## 12. INTEGRAÇÕES

- [ ] Google OAuth: conecta e redireciona de volta
- [ ] Google Analytics: API ativada, propriedade selecionada, dados aparecem
- [ ] Google Search Console: site selecionado, keywords aparecem
- [ ] GitHub: OAuth funciona, repo selecionado, conteúdo aparece
- [ ] WordPress: testar credenciais funciona

---

## 13. APIs CRÍTICAS

Testar via debug ou curl:

- [ ] `/api/analyze-site` — retorna DA (Moz), backlinks, nicho, CPC
- [ ] `/api/integrations/external-backlinks` — cacheia backlinks no banco
- [ ] `/api/integrations/gsc-data` — retorna keywords do GSC
- [ ] `/api/integrations/gsc-keywords-full` — keywords + URL + variação
- [ ] `/api/integrations/gsc-pages` — top páginas
- [ ] `/api/admin/process-backlink` — processa backlink completo
- [ ] `/api/admin/plan-content` — gera 200 keywords
- [ ] `/api/admin/test-article` — pipeline completo de artigo
- [ ] `/api/admin/find-image` — busca/cacheia imagem

---

## Bugs conhecidos

- [ ] `external_backlinks`: campo `authority_points` precisa receber `bl.da` (corrigido mas verificar)
- [ ] `backlinks` tabela: RLS pode bloquear queries server-side (usar service role)
- [ ] `network_sites`: RLS desabilitado (verificar se tá ok pra produção)
- [ ] `content_calendar`: RLS desabilitado
- [ ] Dashboard mostra "Usuário" em vez do nome real se `profile.name` é null
