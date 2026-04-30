# 8links — Fluxo de Criação de Backlinks (Atualizado 2026-04-24)

## Abordagem: Content-First + Niche Edit

O artigo é escrito PARA RANQUEAR no site da rede. O backlink entra como recomendação útil, não como propaganda.

## Arquitetura de arquivos

```
FRONTEND (páginas):
  /keywords                          → Tab "Oportunidades" (GSC) + "Meu Plano" + "Pesquisar"
  /keywords/select-site              → Seleção manual de site da rede
  /backlinks                         → Lista de backlinks criados + status
  /articles/write                    → Editor Surfer-like para artigos

API ROUTES:
  /api/admin/process-backlink        → Orquestra: keyword → artigo → salva
  /api/admin/test-article            → Pipeline completo: SERP → outline → artigo → imagens
  /api/admin/auto-article            → Alternativa (não usado no fluxo principal)
  /api/admin/find-image              → Busca imagem: image_bank → Unsplash → Pexels
  /api/keyword-research              → Busca manual de keywords (DataForSEO)
  /api/admin/plan-content            → Descoberta automática de keywords
  /api/usage                         → Consulta limites do plano

LIBS:
  /lib/apis/dataforseo.ts            → Wrapper DataForSEO (SERP, keywords, backlinks)
  /lib/apis/moz.ts                   → DA via Moz/RapidAPI
  /lib/actions/usage.ts              → Sistema de limites por ação
  /lib/utils/normalize-article.ts    → Pós-processamento do artigo GPT
  /lib/constants.ts                  → Planos, limites, ações

DB TABLES:
  backlinks                          → status: queued → generating → ready_for_review → published → indexed → error
  content_calendar                   → Keywords planejadas por site da rede
  network_sites                      → 67 sites da rede (domínio, nicho, DA)
  keywords                           → Keywords do usuário (GSC + descobertas)
  articles                           → Artigos do usuário (editor)
  usage_tracking                     → Controle de limites por ação
  keyword_suggestions_cache          → Cache de DataForSEO
  image_bank                         → Cache de imagens (tags, URLs)
```

## Fluxo completo (passo a passo)

### 1. Usuário clica "Enviar Backlink"
- Na tab Oportunidades (keywords GSC posição 4-30)
- Ou na tab Meu Plano (keyword com artigo escrito)
- Modal pede: keyword, URL destino, texto âncora
- Escolhe: Automático ou Manual

### 2. Inserção no banco
```
backlinks.insert({
  user_id, client_site_id, target_url, anchor_text,
  anchor_type: "partial", status: "queued"
})
```

### 3. process-backlink (API)
1. Lê backlink + network_site + client_site do banco
2. Busca 50 keywords do content_calendar (status="planned")
3. GPT-4.1-mini escolhe a melhor keyword pro backlink
4. Chama test-article com keyword + backlink context
5. Salva artigo no backlink + marca keyword como "published"
6. Status → "published"

### 4. test-article (pipeline de geração)
1. **SERP**: DataForSEO analisa top 5 do Google ($0.002)
2. **Scrape**: Extrai headings h1-h4 + word count de cada concorrente
3. **Outline**: GPT-4.1-mini consolida outline + termos NLP
4. **Artigo**: GPT escreve (modelo configurável) com word count por seção
5. **Normalização**: Script limpa formatting, FAQ→H3, parágrafos
6. **Imagens**: 1 por 400 palavras (image_bank → Unsplash → Pexels)
7. **Backlink**: Inserido como markdown link 1x no artigo

### 5. Pós-geração
- Article content salvo em `backlinks.article_content`
- Keyword marcada como "published" no content_calendar
- Status do backlink → "published"

## Custos por backlink
| Item | Custo |
|------|-------|
| DataForSEO SERP | $0.002 (R$0.01) |
| GPT outline | ~$0.003 |
| GPT artigo | ~$0.01-0.03 |
| GPT keyword selection | ~$0.002 |
| Imagens | grátis (cache + Unsplash) |
| **Total** | **~R$0.10-0.20** |

## Limites por plano
| Plano | Backlinks/mês | Pesquisas/dia | Descobertas/mês | Artigos/mês |
|-------|--------------|---------------|-----------------|-------------|
| Starter (R$197) | 999 (ilimitado) | 10 | 1 | 10 |
| Pro (R$397) | 999 | 30 | 5 | 100 |
| Legacy (R$997/ano) | 999 | 30 | 40 | 999 |
| Lifetime (R$1.997) | 999 | 30 | 40 | 999 |

## Bugs conhecidos (a corrigir)
1. **Keyword deadlock**: Se content_calendar não tem keywords, backlink fica "queued" pra sempre
2. **Sem publicação real**: Artigo é salvo no DB mas não deployado no site da rede
3. **Sem retry**: Backlinks com erro não têm mecanismo de retry
4. **Error handling**: Erros salvos em article_content ao invés de error_message
5. **Modelo hardcoded**: process-backlink usa "gpt-5.4-nano" hardcoded
