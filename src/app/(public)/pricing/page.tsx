"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Check, X, Link as LinkIcon, Zap, ArrowRight,
  Sparkles, Globe, FileText, Bot, Users, BarChart3,
  Shield, HeartPulse, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 147,
    description: "Para quem está começando",
    features: [
      { text: "1 site", included: true },
      { text: "Backlinks ilimitados", included: true },
      { text: "100 créditos IA/mês", included: true },
      { text: "10 keywords monitoradas", included: true },
      { text: "Google Analytics", included: true },
      { text: "Search Console", included: true },
      { text: "Gamificação + conquistas", included: true },
      { text: "Club (análises ao vivo)", included: true },
      { text: "Suporte WhatsApp (bot)", included: true },
      { text: "WordPress integrado", included: false },
      { text: "CRM Revenda", included: false },
      { text: "White-label", included: false },
    ],
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 297,
    description: "Para quem quer crescer rápido",
    features: [
      { text: "5 sites", included: true },
      { text: "Backlinks ilimitados", included: true },
      { text: "500 créditos IA/mês", included: true },
      { text: "50 keywords monitoradas", included: true },
      { text: "Google Analytics", included: true },
      { text: "Search Console", included: true },
      { text: "Gamificação + conquistas", included: true },
      { text: "Club (análises ao vivo)", included: true },
      { text: "Suporte prioritário", included: true },
      { text: "WordPress integrado", included: true },
      { text: "CRM Revenda", included: true },
      { text: "White-label", included: false },
    ],
    popular: true,
  },
  {
    id: "agency",
    name: "Agência",
    price: 597,
    description: "Para agências e revendedores",
    features: [
      { text: "15 sites", included: true },
      { text: "Backlinks ilimitados", included: true },
      { text: "2.000 créditos IA/mês", included: true },
      { text: "200 keywords monitoradas", included: true },
      { text: "Google Analytics", included: true },
      { text: "Search Console", included: true },
      { text: "Gamificação + conquistas", included: true },
      { text: "Club (análises ao vivo)", included: true },
      { text: "Suporte dedicado", included: true },
      { text: "WordPress integrado", included: true },
      { text: "CRM Revenda", included: true },
      { text: "White-label", included: true },
    ],
    popular: false,
  },
];

const allFeatures = [
  { icon: LinkIcon, title: "Backlinks Ilimitados", desc: "Publicados automaticamente em sites do seu nicho" },
  { icon: Sparkles, title: "Artigos com IA", desc: "Geração de conteúdo estilo Surfer SEO" },
  { icon: Globe, title: "Google Analytics + Search Console", desc: "Dados reais do seu tráfego e posições" },
  { icon: Bot, title: "Visibilidade IA", desc: "Monitore presença no ChatGPT, Perplexity, Gemini" },
  { icon: BarChart3, title: "Dashboard de Progresso", desc: "Score SEO, ROI, conquistas, evolução" },
  { icon: Users, title: "Espionagem de Concorrentes", desc: "Saiba o que eles fazem e faça melhor" },
  { icon: HeartPulse, title: "Diagnóstico Técnico", desc: "Correções automáticas via WordPress" },
  { icon: Radio, title: "Club", desc: "Análises ao vivo semanais dos membros" },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black font-[family-name:var(--font-display)]">8links</span>
        </Link>
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
      </nav>

      {/* Header */}
      <section className="text-center px-6 pt-16 pb-12 max-w-4xl mx-auto relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.06),transparent_60%)] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <h1 className="text-4xl font-black font-[family-name:var(--font-display)] tracking-tight mb-4">
            Planos simples, <span className="text-gradient">resultado real</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Backlinks ilimitados em todos os planos. 14 dias grátis. Cancele quando quiser.
          </p>
        </motion.div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border bg-card p-8 flex flex-col overflow-hidden ${
                plan.popular ? 'card-shine ring-1 ring-[hsl(24,100%,55%,0.2)] scale-[1.02]' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] text-[10px] font-bold text-black uppercase tracking-widest rounded-b-lg font-mono">
                  Mais Popular
                </div>
              )}

              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-muted-foreground mt-4 font-[family-name:var(--font-display)]">{plan.name}</p>
                <p className="text-4xl font-black font-[family-name:var(--font-display)] tracking-tight my-3">
                  <span className="text-lg text-muted-foreground align-top">R$</span>
                  <NumberTicker value={plan.price} />
                </p>
                <p className="text-xs text-muted-foreground font-mono">/mês</p>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className={`flex items-center gap-3 text-sm ${f.included ? '' : 'text-muted-foreground/40'}`}>
                    {f.included ? (
                      <Check className="w-4 h-4 text-[hsl(24,100%,55%)] shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>

              {plan.popular ? (
                <Link href="/register" className="btn-glow rounded-xl w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer">
                  <Zap className="w-4 h-4" /> Começar com Pro
                </Link>
              ) : (
                <Link href="/register">
                  <Button variant="outline" className="w-full" size="lg">Começar</Button>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* All features */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-20">
          <h2 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight text-center mb-3">
            Tudo incluso em <span className="text-gradient">todos os planos</span>
          </h2>
          <p className="text-center text-muted-foreground mb-10">Sem surpresas. Sem taxas escondidas.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {allFeatures.map((f, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 hover:border-[hsl(24,100%,55%,0.3)] transition-colors">
                <f.icon className="w-5 h-5 text-[hsl(24,100%,55%)] mb-3" />
                <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">© 2026 8links. Piloto automático de SEO.</p>
      </footer>
    </div>
  );
}
