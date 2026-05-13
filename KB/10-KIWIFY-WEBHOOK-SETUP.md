# Kiwify Webhook — Configuração

## Visão Geral

A integração com a Kiwify processa pagamentos via **webhook** e atualiza automaticamente o Supabase com:
- Status da assinatura
- Plano contratado
- Data da próxima renovação
- Provedor de pagamento (`kiwify`)

---

## 1. Obter API Key da Kiwify

1. Acesse o painel da Kiwify
2. Vá em **Configurações** → **API**
3. Gere uma nova **API Key**
4. Salve em `.env.local`:

```bash
KIWIFY_API_KEY=sua_api_key_aqui
```

---

## 2. Configurar Webhook Secret (Opcional)

A Kiwify permite gerar um Webhook Secret para validar a autenticidade, mas **atualmente não implementamos essa validação**. Se quiser adicionar no futuro:

1. No painel da Kiwify, vá em **Configurações** → **Webhooks**
2. Gere um **Webhook Secret**
3. Salve em `.env.local`:

```bash
KIWIFY_WEBHOOK_SECRET=seu_webhook_secret_aqui
```

---

## 3. Registrar Webhook na Kiwify

1. No painel da Kiwify, acesse **Configurações** → **Webhooks**
2. Clique em **Novo Webhook**
3. Configure:

| Campo | Valor |
|-------|-------|
| **URL** | `https://app.8links.com.br/api/webhooks/kiwify` (prod) ou `https://seu-ngrok-url.ngrok.io/api/webhooks/kiwify` (dev) |
| **Eventos** | Marque todos: |
| | ☑️ `order_approved` |
| | ☑️ `order_refunded` |
| | ☑️ `subscription_canceled` |
| | ☑️ `subscription_renewed` |
| | ☑️ `subscription_failed` |
| **Secret** | O mesmo gerado no passo 2 |

4. Salve

---

## 4. Testar Localmente (ngrok)

Para desenvolvimento:

```bash
# 1. Inicie o ngrok
ngrok http 3000

# 2. Use a URL gerada no webhook da Kiwify
# Ex: https://abc123.ngrok.io/api/webhooks/kiwify
```

---

## 5. Eventos Suportados

### `order_approved`
- **Quando**: Nova venda ou renovação aprovada
- **Ação**: Cria/atualiza usuário no Supabase
- **Campos atualizados**:
  - `subscription_status` → `active`
  - `plan_id` → Detectado do nome do produto
  - `payment_provider` → `kiwify`
  - `kiwify_subscription_id` → ID da assinatura
  - `subscription_period_end` → Data da próxima cobrança

### `order_refunded`
- **Quando**: Reembolso processado
- **Ação**: Atualiza status para `refunded`

### `subscription_canceled`
- **Quando**: Cliente cancela assinatura
- **Ação**: Atualiza status para `canceled`

### `subscription_renewed`
- **Quando**: Assinatura renovada com sucesso
- **Ação**: Atualiza `subscription_period_end`

### `subscription_failed`
- **Quando**: Pagamento da assinatura falhou
- **Ação**: Atualiza status para `past_due`

---

## 6. Detectar Planos

O webhook detecta o plano automaticamente pelo nome do produto:

| Nome do Produto | Plano no Supabase |
|-----------------|-------------------|
| "8links Starter" | `starter` |
| "8links Pro" | `pro` |
| "8links Agency" | `agency` |
| "8links Lifetime" | `lifetime` |
| "8links Legacy" | `legacy` |

**Importante**: Os produtos na Kiwify devem conter essas palavras no nome.

---

## 7. Logs e Debug

Os webhooks são logados no console:

```bash
# Ver logs do Next.js
tail -f .next/server/app/api/webhooks/kiwify/route.js
```

**Exemplo de log**:
```
[Kiwify Webhook] Received: {
  "webhook_event_type": "order_approved",
  "Customer": { "email": "cliente@email.com" },
  "Subscription": { "status": "active", "plan": { "name": "starter" } }
}
[Kiwify] Processing order_approved event...
[Kiwify] Email: cliente@email.com, Plan: starter
[Kiwify] User found via RPC: uuid-aqui
[Kiwify] Successfully processed for user uuid-aqui, plan starter
```

---

## 8. Campos no Supabase

A integração atualiza a tabela `profiles`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `payment_provider` | text | `kiwify` ou `stripe` |
| `kiwify_subscription_id` | text | ID da assinatura na Kiwify |
| `subscription_status` | text | `active`, `canceled`, `past_due`, etc. |
| `plan_id` | text | `starter`, `pro`, `agency`, `lifetime`, `legacy` |
| `subscription_period_end` | timestamptz | Quando a assinatura vence |

---

## 9. Fluxo de Dados

```
Kiwify (pagamento aprovado)
    ↓
Webhook POST /api/webhooks/kiwify
    ↓
Detectar plano pelo nome do produto
    ↓
Buscar usuário por email (RPC: get_user_id_by_email)
    ↓
Se não existir → Criar usuário (inviteUserByEmail)
    ↓
Atualizar profiles com dados da assinatura
    ↓
Retry em 3s se falhar
```

---

## 10. Troubleshooting

### "User not found"
- Verifique se o RPC `get_user_id_by_email` existe no Supabase
- O usuário é criado automaticamente via invite se não existir

### "Plan not detected"
- O nome do produto na Kiwify deve conter: `starter`, `pro`, `agency`, `lifetime`, ou `legacy`

### "Webhook não chega"
- Verifique se a URL está correta no painel da Kiwify
- Para localhost, use ngrok
- Verifique logs no painel da Kiwify → Webhooks → Histórico

### "Assinatura não atualiza"
- Verifique se `kiwify_subscription_id` está sendo salvo
- Confira se o email do cliente bate com o Supabase

---

## 11. Próximos Passos

Após configurar o webhook:

1. **Testar com uma venda real** (ou sandbox)
2. **Verificar se o usuário foi criado/atualizado** no Supabase
3. **Atualizar os 60 clientes Kiwify** que identificamos na análise:
   ```sql
   UPDATE profiles 
   SET payment_provider = 'kiwify' 
   WHERE email IN (lista dos 60 emails)
   ```

---

## Fontes

- Código base: `src/app/api/webhooks/kiwify/route.ts`
- Utilitários: `src/lib/kiwify/webhook.ts`
- Análise completa: `KB/09-ANALISE-STRIPE-KIWIFY.md`
