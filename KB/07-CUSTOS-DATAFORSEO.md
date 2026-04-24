# 8links — Custos por Ação (Atualizado 2026-04-24)

## Preços das APIs externas

### DataForSEO (por task)
| Endpoint | Custo/task |
|----------|------------|
| `/serp/google/organic/live/advanced` | $0.002 |
| `/dataforseo_labs/google/keyword_suggestions/live` | **$0.012** |
| `/dataforseo_labs/google/ranked_keywords/live` | **$0.012** |
| `/dataforseo_labs/google/competitors_domain/live` | **$0.012** |
| `/backlinks/summary/live` | $0.002 |
| `/backlinks/backlinks/live` | $0.004 |
| `/on_page/content_parsing` | $0.001 |

### OpenAI (por 1M tokens)
| Modelo | Input | Output |
|--------|-------|--------|
| gpt-4.1-mini (primário) | $0.40 | $1.60 |
| gpt-5.4-mini (fallback) | $0.75 | $4.50 |

### Outras APIs
| API | Custo |
|-----|-------|
| Google Search Console | Grátis |
| Google Analytics | Grátis |
| Moz DA (RapidAPI) | Grátis (plano free) |
| Unsplash | Grátis (50 req/hora) |
| Pexels | Grátis (200 req/hora) |
| GPT Vision (image tags) | ~$0.001/imagem |

---

## Custo por AÇÃO DO USUÁRIO

### 1. Pesquisa manual de keyword
| API | Chamadas | Custo |
|-----|----------|-------|
| DataForSEO keyword_suggestions | 1 (cacheado se repetir) | $0.012 |
| **TOTAL** | | **$0.012 (R$0.07)** |

### 2. Descoberta automática de keywords
| API | Chamadas | Custo |
|-----|----------|-------|
| GPT-4.1-mini (gerar 10 seeds) | 1 | ~$0.002 |
| DataForSEO keyword_suggestions | 10 (cacheado) | 10 × $0.012 = $0.12 |
| GPT-4.1-mini (limpar duplicatas) | 1-3 batches | ~$0.005 |
| **TOTAL** | | **$0.127 (R$0.72)** |

### 3. Criar backlink (process-backlink)
| API | Chamadas | Custo |
|-----|----------|-------|
| GPT-4.1-mini (escolher keyword) | 1 | ~$0.002 |
| DataForSEO SERP (analisar concorrentes) | 1 | $0.002 |
| Scrape 5 URLs (fetch direto) | 5 | Grátis |
| GPT-4.1-mini (outline + NLP terms) | 1 | ~$0.004 |
| GPT-4.1-mini (escrever artigo) | 1 | ~$0.010 |
| find-image (Unsplash/Pexels) | 2-4 | Grátis |
| GPT Vision (descrever imagens) | 2-4 | ~$0.003 |
| **TOTAL** | | **$0.021 (R$0.12)** |

### 4. Artigo avulso (editor Surfer-like)
| API | Chamadas | Custo |
|-----|----------|-------|
| DataForSEO SERP | 1 | $0.002 |
| GPT-4.1-mini (outline + artigo) | 2 | ~$0.014 |
| Imagens | 2-4 | ~$0.003 |
| **TOTAL** | | **$0.019 (R$0.11)** |

### 5. Onboarding (1x por site)
| API | Chamadas | Custo |
|-----|----------|-------|
| DataForSEO backlink_summary | 1 | $0.002 |
| DataForSEO ranked_keywords | 1 | $0.012 |
| DataForSEO competitors_domain | 1 | $0.012 |
| DataForSEO backlinks (cache) | 1 | $0.004 |
| Moz DA | 1 | Grátis |
| **TOTAL** | | **$0.030 (R$0.17)** |

### 6. Diagnóstico de conteúdo
| API | Chamadas | Custo |
|-----|----------|-------|
| DataForSEO on_page parsing | 1 | $0.001 |
| GPT-4.1-mini (análise) | 1 | ~$0.005 |
| **TOTAL** | | **$0.006 (R$0.03)** |

### 7. Ações que custam $0.00
| Ação | Fonte dos dados |
|------|----------------|
| Dashboard | Cache do banco |
| Keywords (GSC) | Google API (grátis) |
| Backlinks page | Cache do banco |
| Navegar no app | Tudo do banco |

---

## Resumo de custos por ação

| Ação | DataForSEO | OpenAI | Total USD | Total BRL |
|------|-----------|--------|-----------|-----------|
| Pesquisa keyword | $0.012 | — | **$0.012** | **R$0.07** |
| Descoberta auto | $0.120 | $0.007 | **$0.127** | **R$0.72** |
| Backlink | $0.002 | $0.019 | **$0.021** | **R$0.12** |
| Artigo avulso | $0.002 | $0.017 | **$0.019** | **R$0.11** |
| Onboarding | $0.030 | — | **$0.030** | **R$0.17** |
| Diagnóstico | $0.001 | $0.005 | **$0.006** | **R$0.03** |

---

## Custo máximo mensal por plano

| Plano | Pesquisas | Descobertas | Backlinks | Artigos | **Total máx/mês** |
|-------|-----------|-------------|-----------|---------|-------------------|
| Starter | 300×R$0.07=R$21 | 1×R$0.72 | 50×R$0.12=R$6 | 10×R$0.11=R$1.10 | **R$28.82** |
| Pro | 900×R$0.07=R$63 | 5×R$0.72=R$3.60 | 100×R$0.12=R$12 | 100×R$0.11=R$11 | **R$89.60** |
| Legacy | 900×R$0.07=R$63 | 40×R$0.72=R$28.80 | 200×R$0.12=R$24 | 200×R$0.11=R$22 | **R$137.80** |
| Lifetime | 900×R$0.07=R$63 | 40×R$0.72=R$28.80 | 200×R$0.12=R$24 | 200×R$0.11=R$22 | **R$137.80** |

*Com cache de keywords, custo real é 40-60% menor.*
