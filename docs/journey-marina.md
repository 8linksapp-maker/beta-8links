# Diário da Marina — primeiro dia

> Walk-through real feito via Playwright MCP em 2026-05-07. Marina (test user) com plano Pro ativo, sem nenhum dado, percorrendo a jornada que o usuário reportou: **acessar → cadastrar site → adicionar palavras → criar backlink → criar artigo**.
>
> Regra do diário: **anotar, não consertar**. Tudo que tá ruim vira item da fila. Os 17 itens abaixo saíram dessa única passagem; sem precisar abrir issue tracker.

## Resumo executivo

- **3 bugs reais** que afetam o cliente diretamente.
- **6 problemas de UX/copy** — não quebram, mas confundem.
- **3 jargões técnicos** que precisam tradução pra leigo.
- **5 coisas que ficaram boas** — bom levantar pra não regredir.

A jornada **completa** (login → site → palavra → backlink → artigo gerando) é factível em ~5min, **mas exige refresh manual num ponto crítico** (depois do onboarding o dashboard não atualiza sozinho).

---

## Etapa 1 — Login

**O que aconteceu:** preenchi email/senha, cliquei Entrar, caí em /dashboard em ~1s.

**Veredito:** ✅ **OK**. Tela limpa, sem distração, atalho "Esqueceu?" visível, link pro suporte WhatsApp como fallback. Nenhum atrito.

---

## Etapa 2 — Dashboard pós-login (sem site)

**O que aconteceu:** caí em `/dashboard`. CTA dominante: **"Adicione sua primeira palavra"**. Stats: 0 palavras, 0 backlinks, 0 artigos. Próximos passos mostra **"Site cadastrado"** sem checkmark mas em posição de "concluído".

### 🐛 Bug 1 — CTA propõe ação que não funciona ainda

Dashboard manda Marina **"Adicionar palavra"** quando ela ainda não tem site. Cliquei e caiu em `/palavras` que diz **"Você precisa cadastrar um site primeiro"**.

A ordem natural é: **site → palavra → backlink → artigo**. Mas o dashboard inverte. Cliente leigo segue a sugestão mais visível e quebra a cara. Precisa de detecção de estado: se `sites === 0`, CTA principal vira **"Cadastrar primeiro site"**, não "palavra".

### ⚠️ UX 1 — Checklist com hierarquia errada

"Próximos passos" mostra "Site cadastrado" como **primeiro** item — sem ✓ e sem texto indicando que é o que ela tem que fazer agora. Visualmente parece concluído mesmo quando não está.

---

## Etapa 3 — Cadastrar site (`/sites/new`)

Stepper de 4 passos: **URL → Análise → Nicho → Keywords**.

### Step 1 — URL
- Placeholder `https://meusite.com.br` ✅ claro
- Botão **"Analisar site"** começa visualmente desabilitado mas com cor laranja escura — confunde, parece quase ativo. Não dá pra saber que está bloqueado por estar vazio.

### ⚠️ UX 2 — Breadcrumb feio
Top da página mostra `> new` no breadcrumb. Devia ser `> Adicionar site`.

### Step 2 — Análise
- Animação de 4 steps marcando concluídos um por um (`Verificando → Analisando autoridade → Buscando posições → Identificando concorrentes`). ✅ feedback bom.
- Stats no fim: **AUTORIDADE 1 / BACKLINKS [vazio] / REF. DOMAINS [vazio]**

### 🐛 Bug 2 — Stats numéricos vazios em vez de "0"
Quando o site não tem dados (porque é fictício / novo), os campos Backlinks e Ref. Domains aparecem **completamente em branco**. Devia mostrar `0` ou `—`. Cliente acha que tá faltando dado / quebrado.

### Step 3 — Nicho
- 20 nichos genéricos pré-definidos. Falta **"Contabilidade"** que é o caso da Marina. Tive que escolher "Finanças" como aproximação.
- Sugerido pré-selecionado: **"Geral"** (porque GPT não conseguiu inferir nicho de domínio fictício).

### 🐛 Bug 3 — Nicho selecionado é ignorado no salvar (CRÍTICO)
Cliquei em **"Finanças"** explicitamente. Olhando depois no banco, `niche_primary = "Geral"`. A escolha do usuário foi perdida.

Provável causa: "Geral" foi pré-selecionado, e clicar em "Finanças" adicionou uma 2ª seleção (já que UI permite 1-3 nichos). No save, pegou o primeiro array slot, que era "Geral".

Esse bug é **crítico** — toda a recomendação de sites parceiros usa nicho. Marina contadora vai receber backlinks irrelevantes porque o nicho dela ficou "Geral".

### Step 4 — Keywords
- Tela mostra só "QUER CONQUISTAR" (textarea) — o "JÁ POSICIONA" some quando site não rankeia nada. ✅ esconde graciosamente.
- Preenchi 3 palavras separadas por linha. Salvou ok.

---

## Etapa 4 — Onboarding de integrações (`/integrations/setup`)

4 sub-passos: Google → WordPress → GitHub → Pronto.

### ⚠️ UX 3 — "Pular esta etapa" tem hierarquia visual fraca
Botão "Conectar Google" é grande, laranja, dominante. **"Pular esta etapa"** é um link pequenino no canto inferior direito.

Marina leiga vai achar que **conectar Google é obrigatório**. Cliente novo na fase mais delicada (acabou de pagar) vai travar tentando conectar GA antes de ter site no ar. **Devia ter texto pequeno tipo "Pode fazer depois"** próximo ao botão.

### 🚧 Jargão 1 — "Application Password"
Step do WordPress diz: *"Pra conectar, você precisa de uma Application Password do WordPress. Vá em WordPress → Usuários → Seu perfil → Application Passwords."*

**"Application Password"** vai assustar Marina contadora. Devia ter um vídeo/GIF mostrando o passo-a-passo, ou um botão "Não sei o que é isso, me ajuda".

### 🚧 Jargão 2 — "Astro, Next.js, Hugo"
Step do GitHub: *"Para sites em Astro, Next.js, Hugo e outros"*. Marina contadora não sabe o que é nada disso. Devia ser tipo: *"Se seu site não for em WordPress (avançado, pra desenvolvedores)"*.

### Step "Pronto"
- ✅ Mensagem "Tudo configurado!" + lista de status honesto ("Não conectado")
- ✅ Texto reassurance: *"você pode configurar depois"*
- ✅ CTA único: "Ir para o Dashboard"

---

## Etapa 5 — De volta ao Dashboard (depois do onboarding)

### 🐛 Bug 4 — Dashboard fica desatualizado depois do cadastro (CRÍTICO)

Voltei pro `/dashboard` clicando "Ir para o Dashboard" no fim do onboarding. **Dashboard mostrou tudo zerado**:
- Top bar **sem nenhum site selecionado**
- Stats: 0 palavras (mas eu tinha cadastrado 3)
- Próximos passos: "Site cadastrado" sem ✓ (mas eu tinha acabado de cadastrar)

Banco confirmou que site + 3 palavras estão lá. **Era timing da UI**: o `useActiveSite` hook não pegou o site novo logo após onboarding.

**Como sobrevivi:** naveguei manualmente para `/sites`, voltei pra `/dashboard`. Aí refletiu corretamente.

**Marina não vai sobreviver.** Ela vai olhar pro dashboard zerado, achar que perdeu os dados que acabou de cadastrar, e **abrir ticket de suporte ou cancelar**.

Esse é o pior bug de toda a jornada.

---

## Etapa 6 — Backlinks (`/backlinks`)

### EmptyState ✅
- Texto **excelente**: "Backlinks são links de outros sites apontando pro seu — quanto mais você tem, mais o Google confia. Comece criando o primeiro a partir de uma palavra do seu plano."
- Marina entende sem jargão. ✅✅✅ ouro.

### Modal "Criar backlink" ✅
- 4 perguntas claras: **Pra onde apontar / Qual palavra / Texto do link / Quantos backlinks**
- Toggle "Por palavra" vs "URL específica" ✅
- Botões 1 / 5 / 10 ✅
- Texto reassurance: *"A gente escolhe os melhores sites parceiros baseado no seu nicho."*
- Quando seleciona 5 ou mais, abre seção **"Variação dos textos"** com explicação anti-spam: *"Variar os textos é o que faz o Google confiar — usar sempre a mesma palavra exata vira sinal de spam."* ✅✅ educa Marina sem jargão Penguin/algoritmo.

Tem opção **"Personalizar"** pra editar âncoras. Bom.

### Lista de backlinks
Após criar 5, aparece na tabela:
- Status badges: "Na fila" / "Gerando" (pipeline em andamento)
- Filtros: Todos / Na fila / Gerando / Pendentes / Publicados / Com erro
- Site parceiro escolhido automaticamente (vidigalbergue.com.br, traineefiat.com.br, etc.)
- Coluna "Quando" com **"agora"** humanizado ✅

### ⚠️ UX 4 — Dois sumários redundantes no header
Header mostra `Mostrando 5 de 5 backlinks - 0 publicados` E também `Publicar backlinks pendentes (2)` em botão à parte. Confuso — o que conta como "pendente"? Por que 2 e não 5? A tabela vai ter um filtro "Pendentes" também.

---

## Etapa 7 — Artigos (`/articles`)

### EmptyState
- "Conteúdo escrito por IA pra subir seu site no Google."  ✅
- 4 stat cards no topo (Total, Rascunhos, Publicados, Palavras escritas) — **todos completamente vazios sem números**.

### 🐛 Bug 5 — Stats vazios em vez de "0"
Mesmo problema do step 2 do cadastro de site. Quando estado vazio, números somem completamente. Devia mostrar `0`.

### Modal "Criar Artigo com IA"
- Lista as 3 keywords cadastradas com **"0 vol"** ao lado.

### 🚧 Jargão 3 — "0 vol"
"Vol" é abreviação de "volume de busca". Marina não-técnica não sabe. Devia ser **"0 buscas/mês"** ou **omitir quando o dado é 0**. Atualmente parece código de erro.

### Pipeline de geração ✅
Após selecionar keyword, navegou pra `/articles/write?keyword=...`. Tela mostra:
- Keyword grande no topo
- Stepper de 5 passos: **1. Analisando concorrentes / 2-5. (próximos)**
- Texto: *"Isso pode levar 1-2 minutos"* — ✅ define expectativa
- Spinner animado

✅ Marina sabe que vai demorar, sabe o que tá rolando. **Bom.**

---

## Etapa 8 — Palavras (`/palavras`)

Acessei depois pra ver UX da tela.

### ✅ Página bem feita
- Título: "Suas palavras" + subtítulo claro: *"As palavras que você quer aparecer no Google. Pra cada uma, você cria backlinks ou escreve artigos."*
- 3 stat cards: **Palavras no plano 3** (+3 esta semana) / **Com página definida** / **Já no Google**
- Tabs: "Meu plano (3)" / "Keyword Planner"
- Quick-add input no topo: `Adicionar uma palavra ao plano (ex: cosmético natural)`
- Por palavra, ações **Backlink** + **Artigo** lado a lado ✅
- "Definir página" como sub-link opcional

Provavelmente a melhor página da jornada. Marina entende imediatamente.

### ⚠️ UX 5 — "+3 esta semana" assumindo histórico
Stat mostra "+3 esta semana" com setinha verde de growth. Mas é o primeiro dia da Marina — **3 é o total dela, não +3 sobre algo anterior**. Pode parecer que ela ganhou 3 a mais do que tinha antes (mistério). Devia esconder o "esta semana" no primeiro uso, ou textualmente: "todas adicionadas hoje".

---

## Outras coisas que reparei

### ⚠️ UX 6 — Banner "migração" persiste
Em quase todas as telas, no topo: *"Nova atualização! Seus backlinks e sites estão sendo migrados. Nenhum dado foi perdido."* — banner laranja brilhante. Marina nova **não migrou nada**, é primeiro acesso dela. Esse banner devia sumir pra contas criadas após data X.

### ⚠️ UX 7 — Itens "BREVE" demais na sidebar
A seção **Inteligência** tem 5 itens: Auditoria, Mapa de Conteúdo, Visibilidade IA, Concorrentes, Saúde do Site. **TODOS** com badge "BREVE". A seção **Negócio** tem 3, **TODOS** "BREVE" (Revenda, Relatórios, Club).

8 de ~14 links na sidebar são "BREVE". Marina vai sentir que **mais da metade do produto não funciona**. Recomendação: ou esconder os BREVE até estarem prontos, ou agrupá-los visualmente como "Em breve" separado, não no menu principal.

---

## Coisas boas que não podem regredir

1. **EmptyState dos backlinks** — texto explicativo perfeito pra leigo
2. **Modal de criar backlink** — 4 perguntas claras, com explicação de variação anti-spam
3. **Página `/palavras`** — fluxo Backlink + Artigo lado a lado
4. **Stepper visual com tempo esperado** ("Isso pode levar 1-2 min") na geração de artigo
5. **Reassurance no fim do onboarding**: "você pode configurar depois"

---

## Fila priorizada

### 🔴 Críticos (afetam Marina hoje)
1. **Bug 4** — dashboard não atualiza após onboarding → **forçar reload do useActiveSite hook**
2. **Bug 3** — nicho selecionado é ignorado no salvar → **revisar lógica de toggle no step 3**
3. **Bug 1** — CTA "Adicionar palavra" antes de site → **trocar pra "Cadastrar primeiro site" quando sites === 0**

### 🟡 Médios (confundem mas não quebram)
4. **Bug 2 & Bug 5** — stats vazios em vez de "0" → revisão visual em todos os stat cards (provavelmente um issue só, replicado)
5. **UX 3** — "Pular esta etapa" pequeno demais no onboarding → reforçar texto de "pode fazer depois"
6. **UX 7** — sidebar com 8/14 "BREVE" → agrupar/esconder até implementar
7. **UX 6** — banner "migração" pra conta nova → conditional render por `created_at`
8. **Jargão 1, 2, 3** — Application Password / Astro+Next+Hugo / "vol" → tradução pra leigo

### 🟢 Baixos
9. **UX 1** — checklist sem ✓ no item concluído
10. **UX 2** — breadcrumb "new" → "Adicionar site"
11. **UX 4** — dois sumários redundantes em /backlinks
12. **UX 5** — "+3 esta semana" no primeiro dia
13. Falta nicho "Contabilidade" na lista
14. Botão "Analisar site" desabilitado parece habilitado (cor laranja escura confunde)

---

## Tempo total da jornada

- Login → Dashboard: **2s**
- Dashboard → Cadastro de site (4 steps + integrations skip): **~80s**
- Dashboard atualizar (com bypass de bug): **+30s manuais**
- Backlinks → criar 5: **~15s**
- Artigos → começar geração: **~10s**
- Palavras → adicionar 1 nova: **~5s**

**Total feliz**: ~2-3 min real interagindo. Adicionando tempo de leitura, **5-7 min** pra Marina chegar de "comprou" até "primeiro backlink rodando".

Isso é **bom** se as 3 falhas críticas forem corrigidas. Se a Marina topar com Bug 4 (dashboard zerado), ela trava antes do passo 5 e pede cancelamento.
