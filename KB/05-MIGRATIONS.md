# 8links — Migrations do Banco de Dados

## Ordem de execução (Supabase SQL Editor)

Rodar na ordem. Cada migration é idempotente (pode rodar mais de 1x sem erro).

### 001 - Schema inicial
- Tabelas: plans, profiles, client_sites, network_sites, niche_contexts, backlinks, keywords, articles, ai_visibility_checks, competitors, achievements, reseller_clients, conversations, messages, reports, credit_transactions, site_audits, club_candidates, notifications
- RLS policies
- Indexes

### 002 - Subject em conversations
```sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS subject text;
```

### 003 - GitHub em client_sites
```sql
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS github_token text;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS github_username text;
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS github_repo text;
```

### 004 - External backlinks (cache DataForSEO)
- Cria tabela external_backlinks
- Adiciona backlinks_fetched_at em client_sites

### 005 - Fix keywords RLS
- Adiciona policies INSERT/UPDATE/DELETE em keywords
- Adiciona INSERT em competitors

### 006 - CPC e atividade
- Adiciona avg_cpc em client_sites
- Adiciona last_active_at em profiles

### 007 - Site context
```sql
ALTER TABLE client_sites ADD COLUMN IF NOT EXISTS site_context jsonb DEFAULT '{}';
```

### 008 - Backlinks nullable network
```sql
ALTER TABLE backlinks ALTER COLUMN network_site_id DROP NOT NULL;
```

### 009 - Network sites expandido
- Adiciona: vercel_url, site_context, categories, brand_voice, wp/github credentials
- Insere 67 sites da rede

### 010 - Image bank
- Cria tabela image_bank (GIN index nas tags)

### 011 - Content calendar
- Cria tabela content_calendar

## Pós-migrations (manual)

```sql
-- Desabilitar RLS em tabelas admin
ALTER TABLE network_sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar DISABLE ROW LEVEL SECURITY;
ALTER TABLE image_bank DISABLE ROW LEVEL SECURITY;

-- Setar admin
UPDATE profiles SET role = 'admin' WHERE email = 'SEU_EMAIL';
```
