# 8links — Variáveis de Ambiente

## Todas as env vars necessárias para produção

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://8links.com.br

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# DataForSEO
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# OpenAI
OPENAI_API_KEY=

# Moz (RapidAPI)
MOZ_RAPIDAPI_KEY=

# Image APIs
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Kiwify (opcional)
KIWIFY_WEBHOOK_SECRET=
```

## Redirect URIs para configurar

### Google Cloud Console
```
https://8links.com.br/api/auth/google/callback
```

### GitHub OAuth App
```
https://8links.com.br/api/auth/github/callback
```

### Stripe Webhook
```
https://8links.com.br/api/webhooks/stripe
```
