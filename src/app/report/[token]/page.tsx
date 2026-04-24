import { Link as LinkIcon, TrendingUp, Globe, BarChart3, CheckCircle2 } from "lucide-react";

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(24,100%,55%)] to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-4">
            <LinkIcon className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-1">Relatório SEO</h1>
          <p className="text-sm text-muted-foreground">clinicajoao.com.br • Abril 2026</p>
          <p className="text-xs text-muted-foreground font-mono mt-2">Token: {token.slice(0, 8)}...</p>
        </div>

        {/* Score */}
        <div className="rounded-2xl border bg-card p-8 text-center mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Score SEO</p>
          <p className="text-6xl font-black font-[family-name:var(--font-display)] tracking-tight" style={{ background: 'linear-gradient(135deg, hsl(24, 100%, 55%), hsl(45, 100%, 65%))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            62
          </p>
          <p className="text-lg text-muted-foreground">/100</p>
          <p className="text-sm text-success font-semibold mt-2">↑ 12 pontos este mês</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { icon: TrendingUp, label: "Domain Authority", value: "28", change: "+3" },
            { icon: Globe, label: "Tráfego Orgânico", value: "890", change: "+45%" },
            { icon: LinkIcon, label: "Backlinks Ativos", value: "34", change: "+12" },
            { icon: BarChart3, label: "Keywords Top 10", value: "5", change: "+2" },
          ].map((m, i) => (
            <div key={i} className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <m.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{m.label}</span>
              </div>
              <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">{m.value}</p>
              <p className="text-xs font-semibold text-[hsl(152,70%,48%)] mt-0.5">{m.change}</p>
            </div>
          ))}
        </div>

        {/* What was done */}
        <div className="rounded-xl border bg-card p-6 mb-6">
          <h3 className="text-sm font-bold mb-4">O que foi feito em Abril</h3>
          <div className="space-y-3">
            {[
              "12 backlinks publicados em sites de autoridade",
              "2 artigos otimizados para SEO publicados",
              "Monitoramento diário de 15 keywords",
              "Auditoria técnica com 3 correções aplicadas",
              "Keyword \"clínica odontológica SP\" subiu para posição #7",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[hsl(152,70%,48%)] mt-0.5 shrink-0" />
                <span className="text-sm text-[hsl(20,8%,50%)]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Relatório gerado automaticamente</p>
          <p className="mt-1">Powered by 8links</p>
        </div>
      </div>
    </div>
  );
}
