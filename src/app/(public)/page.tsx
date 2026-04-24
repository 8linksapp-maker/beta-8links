import Link from "next/link";
import { ArrowRight, Check, Link as LinkIcon, Zap, BarChart3, Bot } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black font-[family-name:var(--font-display)]">8links</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Entrar
          </Link>
          <Link
            href="/register"
            className="btn-glow rounded-lg px-5 py-2 text-sm font-bold inline-flex items-center gap-2"
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-16 max-w-4xl mx-auto relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,hsl(24_100%_55%/0.08),transparent_60%)] pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(24,100%,55%,0.1)] ring-1 ring-[hsl(24,100%,55%,0.2)] text-xs font-semibold text-[hsl(24,100%,55%)] mb-8 font-mono tracking-wider">
            <Zap className="w-3.5 h-3.5" /> PILOTO AUTOMÁTICO DE SEO
          </div>

          <h1 className="text-5xl md:text-6xl font-black font-[family-name:var(--font-display)] tracking-tight leading-[1.1] mb-6">
            Backlinks ilimitados.
            <br />
            <span className="text-gradient">Crescimento real.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Cadastre seu site, ative o piloto automático, e veja seu tráfego crescer.
            Backlinks, artigos com IA, e monitoramento completo — sem precisar entender de SEO.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="btn-glow rounded-xl px-8 py-3.5 text-base font-bold inline-flex items-center gap-2"
            >
              Comece grátis — 14 dias <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/verificar-nicho" className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Funciona pro meu nicho?
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { icon: LinkIcon, title: "Backlinks Ilimitados", desc: "O sistema cria e publica backlinks automaticamente nos sites certos para o seu nicho." },
              { icon: Bot, title: "Artigos com IA", desc: "Geração de conteúdo otimizado baseado nos concorrentes que já rankeiam no Google." },
              { icon: BarChart3, title: "Resultados Visíveis", desc: "Dashboard com dados reais do Google Analytics e Search Console. Veja seu ROI." },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 hover:border-[hsl(24,100%,55%,0.3)] transition-colors">
                <div className="w-10 h-10 rounded-lg bg-[hsl(24,100%,55%,0.1)] flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-[hsl(24,100%,55%)]" />
                </div>
                <h3 className="text-sm font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-center mb-3">
          Planos simples, <span className="text-gradient">resultado real</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12">Backlinks ilimitados em todos os planos. Cancele quando quiser.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Starter", price: "147", sites: "1 site", credits: "100 créditos IA", popular: false },
            { name: "Pro", price: "297", sites: "5 sites", credits: "500 créditos IA", popular: true },
            { name: "Agência", price: "597", sites: "15 sites", credits: "2.000 créditos IA", popular: false },
          ].map((plan) => (
            <div key={plan.name} className={`rounded-xl border bg-card p-8 text-center relative overflow-hidden ${plan.popular ? 'card-shine ring-1 ring-[hsl(24,100%,55%,0.2)]' : ''}`}>
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] text-[10px] font-bold text-black uppercase tracking-widest rounded-b-lg font-mono">
                  Popular
                </div>
              )}
              <p className="text-sm font-semibold text-muted-foreground mt-4 font-[family-name:var(--font-display)]">{plan.name}</p>
              <p className="text-4xl font-black font-[family-name:var(--font-display)] tracking-tight my-3">
                <span className="text-lg text-muted-foreground align-top">R$</span>{plan.price}
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-6">/mês</p>
              <ul className="text-left space-y-2.5 mb-8">
                {[plan.sites, plan.credits, "Backlinks ilimitados", "Google Analytics", "Search Console"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-[hsl(24,100%,55%)] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {plan.popular ? (
                <Link href="/register" className="btn-glow rounded-xl w-full py-2.5 text-sm font-bold inline-flex items-center justify-center cursor-pointer">
                  Começar com Pro
                </Link>
              ) : (
                <Link href="/register" className="inline-flex items-center justify-center w-full rounded-lg border border-[hsl(20,10%,18%)] bg-transparent hover:bg-[hsl(20,8%,10%)] px-4 py-2.5 text-sm font-semibold transition-colors">
                  Começar
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          © 2026 8links. Piloto automático de SEO.
        </p>
      </footer>
    </div>
  );
}
