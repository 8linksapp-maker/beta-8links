# QA E2E — Checklist Live (Marivone)

> **CONTA:** pessoal do Bruno (novaeracomvisual@gmail.com). NUNCA escreve senha
> em arquivo/commit/done report. NUNCA deleta sites/artigos pré-existentes.
> Tudo que criar leva prefixo `qa-teste-`. Pós-QA: deleta SÓ o que criou.

## Pré-setup (uma vez, antes dos cenários)

- [ ] Login em `/login` com conta do Bruno
- [ ] Lista sites pré-existentes em `/sites` — anotar nomes/IDs pra NÃO mexer
- [ ] Lista artigos pré-existentes em `/artigos` — idem

## Site A — GitHub only (Cenário 2 + 5.1/5.2/5.3)

- [ ] `/sites/new` → cria site:
  - Nome: `qa-teste-blog-github`
  - URL: `https://blog-teste-8links.vercel.app`
  - (sem WP) (sem GH ainda)
- [ ] `/integracoes` → conecta GitHub OAuth no site A → seleciona repo `medeirosjj123/blog-teste-8links`
- [ ] Confere em `/integracoes`: card "GitHub" deve mostrar "Conectado" pro site A

### Cenário 2 — só GitHub conectado

- [ ] `/artigos/write` → gera artigo:
  - Site: qa-teste-blog-github
  - Título: `qa-teste-cenario-2 hello world`
  - Keyword: `qa-teste-keyword`
- [ ] Botão Publicar
- [ ] **Esperado:**
  - [ ] **SEM** dialog de escolha (só 1 integração)
  - [ ] Toast: `"Commit feito! Vai aparecer no site em 2-5min após o deploy."`
  - [ ] Action toast "Abrir" abre URL
- [ ] **Network tab:**
  - [ ] GET `/api/articles/{id}/publish-status` → 200 `{hasWp:false, hasGithub:true, ...}`
  - [ ] POST `/api/articles/{id}/publish` body `{}` → 200 `{success:true, publishedUrl, via:"github"}`
- [ ] **GitHub Contents API check** (offline via `check-commit.mjs`):
  - [ ] Arquivo `src/content/blog/qa-teste-cenario-2-hello-world.md` existe no repo
  - [ ] Frontmatter tem `title`, `description`, `pubDate`, `keyword`
- [ ] **DB check** (via app UI ou Supabase Studio):
  - [ ] `articles.published_url` = `https://blog-teste-8links.vercel.app/blog/qa-teste-cenario-2-hello-world/`
  - [ ] `articles.status` = `published`
  - [ ] `articles.wp_post_id` = `null`
- [ ] **Vercel deploy** (em `vercel.com/medeirosjj123/blog-teste-8links` ou aguardar 2-5min):
  - [ ] Build verde
  - [ ] Após deploy: GET `https://blog-teste-8links.vercel.app/blog/qa-teste-cenario-2-hello-world/` retorna 200 com conteúdo do artigo

### Cenário 5.1 — Slug conflito

- [ ] Gera 2º artigo com mesmo título: `qa-teste-cenario-2 hello world`
- [ ] Publica
- [ ] **Esperado:** commit em `src/content/blog/qa-teste-cenario-2-hello-world-1.md`
- [ ] Gera 3º — commit em `...-2.md`
- [ ] **(Opcional pra validar throw)** Cria manualmente -3/-4/-5 no GitHub via UI, gera 6º artigo no app — esperado: toast `"Já existe artigo com nome parecido no repo. Mude o título e tente de novo."`

### Cenário 5.2 — Token GitHub expirado

- [ ] Em github.com/settings/connections/applications → revoga o app do 8links
- [ ] Tenta publicar artigo novo
- [ ] **Esperado:**
  - [ ] Toast: `"Sua conexão com GitHub venceu. Reconecte em Integrações."`
  - [ ] Network: POST `/publish` → 401 `{code:"github_auth_failed"}`
- [ ] Reconecta GH OAuth pra continuar

### Cenário 5.3 — Repo sem permissão

- [ ] Em DB (ou via Supabase): altera `client_sites.github_repo` do site A pra `medeirosjj123/repo-que-nao-existe` (ou um privado sem acesso)
- [ ] Tenta publicar
- [ ] **Esperado:**
  - [ ] Toast: `"Não conseguimos acessar o repositório. Confira se ele existe e se você tem permissão."`
  - [ ] Network: POST `/publish` → 502 `{code:"github_repo_error"}`
- [ ] Reverte github_repo pro original

### Cenário 5.4 — Conteúdo vazio

- [ ] Gera artigo, apaga TODO o conteúdo, salva como rascunho
- [ ] Publica
- [ ] **Esperado:**
  - [ ] Toast com `"Esse artigo não tem conteúdo pra publicar"`
  - [ ] Network: POST `/publish` → 400

## Site B — WordPress only (Cenário 1 - regressão)

- [ ] `/sites/new` → cria site dummy:
  - Nome: `qa-teste-blog-wp`
  - URL: qualquer URL WP de teste do Bruno (perguntar se necessário)
- [ ] `/integracoes` → conecta WordPress (Application Password)
- [ ] (sem GH)

### Cenário 1 — só WP (regressão)

- [ ] `/artigos/write` → gera `qa-teste-cenario-1 regressao wp` no site B
- [ ] Publicar
- [ ] **Esperado:**
  - [ ] **SEM** dialog intermediário
  - [ ] Toast: `"Publicado no seu site!"`
  - [ ] Network: GET publish-status `{hasWp:true, hasGithub:false}`
  - [ ] Network: POST publish `{}` → 200 `{success:true, publishedUrl, postId, via:"wordpress"}`
- [ ] DB: `articles.wp_post_id` setado, `published_url` = link do post WP

## Site C — WP + GitHub (Cenário 3)

- [ ] No Site B (qa-teste-blog-wp), conecta também GitHub
  - OU: cria 3º site `qa-teste-blog-ambos`
- [ ] Gera artigo `qa-teste-cenario-3 ambos`

### Cenário 3a — Escolhe GitHub

- [ ] Publicar
- [ ] **Esperado:**
  - [ ] Abre `ChooseIntegrationDialog`
  - [ ] Botão "Publicar" do dialog **desabilitado** sem escolha
  - [ ] Escolhe GitHub → botão habilita
  - [ ] Clica Publicar → toast GitHub
  - [ ] Network: POST `{via:"github"}`

### Cenário 3b — Escolhe WordPress

- [ ] Gera novo artigo `qa-teste-cenario-3b`
- [ ] Publicar → modal → WordPress → Publicar
- [ ] **Esperado:** Network POST `{via:"wordpress"}`, toast WP

## Site D — Sem integração (Cenário 4)

- [ ] `/sites/new` → `qa-teste-blog-vazio` (URL qualquer)
- [ ] Sem WP, sem GH
- [ ] Gera artigo `qa-teste-cenario-4` nesse site
- [ ] Publicar
- [ ] **Esperado:**
  - [ ] Abre `NoIntegrationDialog`
  - [ ] Header mostra URL limpa (sem `https://`)
  - [ ] Clica "Conectar WordPress" → navega pra `/integracoes?open=wordpress` E dialog WP abre automaticamente
  - [ ] Fecha dialog WP → URL volta pra `/integracoes` (sem `?open=`)
  - [ ] F5 → dialog NÃO reabre (URL limpa)
  - [ ] Repete com "Conectar GitHub" → `/integracoes?open=github` + dialog GH abre

## Mobile (375px) — todos os cenários

- [ ] DevTools → Toolbar → iPhone SE (375px)
- [ ] Repete cenários 1-4 (smoke rápido):
  - [ ] Dialogs renderizam empilhados (grid-cols-1)
  - [ ] Touch targets ≥44px nos cards radio
  - [ ] Sem overflow horizontal
  - [ ] Sem texto cortado

## A11y manual

- [ ] Tab navega entre cards radio em ChooseIntegrationDialog
- [ ] Focus visible em cada card (ring laranja)
- [ ] Enter no card seleciona (set picked)
- [ ] Enter no botão Publicar dispara publish
- [ ] ESC fecha o dialog
- [ ] (Sample) NVDA: anuncia "radiogroup, Escolha a integração", "radio, WordPress"

## Cleanup pós-QA

- [ ] Deleta artigos criados (prefixo `qa-teste-`)
- [ ] Deleta sites criados (qa-teste-blog-github, qa-teste-blog-wp, qa-teste-blog-vazio)
- [ ] Remove arquivos qa-teste-*.md do repo `medeirosjj123/blog-teste-8links` (via UI GitHub) — manter o repo limpo pro Bruno

## Critério final

- 5/5 cenários completos com [ok] em todos os items
- 0 bug crítico/high
- Screenshots em `scripts/qa/screenshots/` (zipados se possível)
- Bugs medium/low → registrar em bugs/ para Genilson decidir
