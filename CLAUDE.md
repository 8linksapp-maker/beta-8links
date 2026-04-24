@AGENTS.md

# 8links — Piloto Automático de SEO

## Sobre o projeto
SaaS de crescimento orgânico no piloto automático. Backlinks ilimitados + artigos IA + monitoramento Google + visibilidade em IAs + CRM para revenda.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 com @theme inline
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Motion (framer-motion v12) para animações
- Recharts para gráficos
- TanStack Table + TanStack Query
- cmdk para command palette
- Sonner para toasts
- Stripe + Kiwify para pagamentos
- Evolution API para WhatsApp

## Design System
- Dark-only, laranja dominante (hsl(24 100% 55%))
- Fontes: Outfit (display), Satoshi (body), IBM Plex Mono (data)
- Efeitos: border-beam, shine-border, btn-glow, noise texture
- Componentes em src/components/ui/

## Convenções
- Server Actions em src/lib/actions/
- API wrappers em src/lib/apis/
- "use client" explícito em componentes client-side
- Portuguese (pt-BR) em toda a UI
- Linguagem simples, público leigo em SEO
- Next.js 16: params são Promise (await em server components), proxy.ts ao invés de middleware.ts

## Referência completa
Ver PRODUCT_SPEC.md para especificação detalhada do produto.
