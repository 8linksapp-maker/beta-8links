"use client";

import { useState, useEffect } from "react";
import {
  Activity, DollarSign, Zap, AlertTriangle, Database,
  FileText, Search, Target, Link as LinkIcon, RefreshCw,
  Check, Clock, XCircle, Users, Calendar, TrendingUp, UserX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Period = "today" | "week" | "month" | "custom";

export default function ApiMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const load = async (p?: Period) => {
    setLoading(true);
    const usePeriod = p ?? period;
    let url = `/api/admin/api-monitor?period=${usePeriod}`;
    if (usePeriod === "custom" && customFrom) url += `&from=${new Date(customFrom).toISOString()}`;
    if (usePeriod === "custom" && customTo) url += `&to=${new Date(customTo + "T23:59:59").toISOString()}`;
    const res = await fetch(url);
    setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changePeriod = (p: Period) => { setPeriod(p); load(p); };

  if (loading && !data) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;
  }

  const u = data?.usage ?? {};
  const bl = data?.backlinks ?? {};
  const costs = data?.costs ?? {};

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Monitor de APIs</h1>
          <p className="text-sm text-muted-foreground">{data?.period?.label} · {data?.uniqueUsers ?? 0} usuários ativos</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => load()}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50">
          {([
            { key: "today" as const, label: "Hoje" },
            { key: "week" as const, label: "7 dias" },
            { key: "month" as const, label: "Mês" },
            { key: "custom" as const, label: "Personalizado" },
          ]).map(p => (
            <button key={p.key} onClick={() => changePeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                period === p.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-2 py-1 bg-card border border-border rounded text-xs font-mono" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-2 py-1 bg-card border border-border rounded text-xs font-mono" />
            <Button size="sm" className="h-7 text-xs" onClick={() => load("custom")}>Filtrar</Button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KPI icon={DollarSign} label="Custo total" value={`R$ ${costs.totalBRL?.toFixed(2) ?? "0.00"}`} sub={`$${costs.totalUSD?.toFixed(3) ?? "0"}`} color="text-primary" />
        <KPI icon={Zap} label="Backlinks" value={bl.published ?? 0} sub={`${bl.errorsPeriod ?? 0} erros · ${bl.queued ?? 0} fila`} color="text-success" />
        <KPI icon={FileText} label="Artigos" value={data?.articles?.count ?? 0} color="text-info" />
        <KPI icon={Users} label="Usuários ativos" value={data?.uniqueUsers ?? 0} color="text-foreground" />
        <KPI icon={Database} label="Cache keywords" value={data?.cache?.keywordSeeds ?? 0} sub="Seeds salvos" color="text-muted-foreground" />
      </div>

      {/* Health KPIs (success rate, inactive users, article funnel) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI
          icon={TrendingUp}
          label="Taxa de sucesso (backlinks)"
          value={bl.successRate != null ? `${bl.successRate}%` : "—"}
          sub={`${bl.published ?? 0} publicados / ${bl.errorsPeriod ?? 0} erros`}
          color={bl.successRate == null ? "text-muted-foreground" : bl.successRate >= 80 ? "text-success" : bl.successRate >= 50 ? "text-warning" : "text-destructive"}
        />
        <KPI
          icon={UserX}
          label="Usuários inativos (14d)"
          value={data?.health?.inactive14d ?? 0}
          sub={`${data?.health?.recentlyActive ?? 0} de ${data?.health?.activeProfiles ?? 0} usaram a plataforma`}
          color={(data?.health?.inactive14d ?? 0) > 0 ? "text-warning" : "text-success"}
        />
        <KPI
          icon={FileText}
          label="Artigos por status"
          value={data?.articles?.count ?? 0}
          sub={Object.entries(data?.articles?.byStatus ?? {}).map(([s, n]) => `${s}: ${n}`).join(" · ") || "Nenhum no período"}
          color="text-info"
        />
      </div>

      {/* Usage table — from real data */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Uso de APIs — dados reais</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Ação</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Hoje</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Período</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">DataForSEO</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">OpenAI</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Total USD</th>
                <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Total BRL</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(costs.perAction ?? {}).map(([key, unit]: [string, any]) => {
                const bd = costs.breakdown?.[key];
                const today = u[key]?.today ?? 0;
                return (
                  <tr key={key} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{unit.label}</span>
                      <p className="text-[9px] text-muted-foreground font-mono">
                        ${unit.dataforseo > 0 ? `DF $${unit.dataforseo}` : ""}
                        {unit.dataforseo > 0 && unit.openai > 0 ? " + " : ""}
                        {unit.openai > 0 ? `GPT $${unit.openai}` : ""}
                        {unit.dataforseo === 0 && unit.openai === 0 ? "Grátis" : ""} /chamada
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">{today}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">{bd?.calls ?? 0}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">${(bd?.dataforseo ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground">${(bd?.openai ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">${(bd?.total ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">R${((bd?.total ?? 0) * 5.7).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-primary/5">
                <td className="px-3 py-2.5 font-bold text-xs" colSpan={3}>Total do período</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">${costs.dataforseoTotal?.toFixed(3)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-bold">${costs.openaiTotal?.toFixed(3)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-primary">${costs.totalUSD?.toFixed(3)}</td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-primary">R${costs.totalBRL?.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {/* Top users + Unit costs reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top users */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Top usuários</h3>
            <div className="space-y-1">
              {(data?.topUsers ?? []).map((user: any, i: number) => (
                <div key={user.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/30 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground font-mono w-4">{i + 1}</span>
                    <span className="truncate">{user.name || user.email}</span>
                    <Badge variant="outline" className="text-[8px] shrink-0">{user.plan}</Badge>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                    {user.actions?.keyword_search > 0 && <span title="Pesquisas"><Search className="w-2.5 h-2.5 inline" /> {user.actions.keyword_search}</span>}
                    {user.actions?.backlink > 0 && <span title="Backlinks" className="text-success"><LinkIcon className="w-2.5 h-2.5 inline" /> {user.actions.backlink}</span>}
                    {user.actions?.article > 0 && <span title="Artigos"><FileText className="w-2.5 h-2.5 inline" /> {user.actions.article}</span>}
                    <span className="font-bold">{user.total}</span>
                  </div>
                </div>
              ))}
              {(data?.topUsers?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum uso no período</p>}
            </div>
          </CardContent>
        </Card>

        {/* Unit cost reference */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Guia de custos por ação</h3>
            <div className="space-y-1.5 text-xs">
              {Object.entries(costs.perAction ?? {}).map(([key, unit]: [string, any]) => {
                const totalUnit = unit.dataforseo + unit.openai;
                return (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                    <span className="text-muted-foreground">{unit.label}</span>
                    <div className="flex items-center gap-3 font-mono text-[10px]">
                      {unit.dataforseo > 0 && <span className="text-muted-foreground/60">DF ${unit.dataforseo}</span>}
                      {unit.openai > 0 && <span className="text-muted-foreground/60">GPT ${unit.openai}</span>}
                      <span className="font-bold">${totalUnit.toFixed(3)}</span>
                      <span className="text-primary font-bold">R${(totalUnit * 5.7).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t text-[10px] text-muted-foreground">
              <p>Câmbio: $1 = R$5.70 · Modelo primário: gpt-4.1-mini</p>
              <p>Fallback: gpt-4.1-nano (mais barato que primário)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily breakdown */}
      {(data?.dailyBreakdown?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Uso diário</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] font-mono">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-2 py-1 text-muted-foreground">Data</th>
                    <th className="text-right px-2 py-1 text-muted-foreground">Pesquisas</th>
                    <th className="text-right px-2 py-1 text-muted-foreground">Descobertas</th>
                    <th className="text-right px-2 py-1 text-muted-foreground">Backlinks</th>
                    <th className="text-right px-2 py-1 text-muted-foreground">Artigos</th>
                    <th className="text-right px-2 py-1 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.dailyBreakdown ?? []).map((d: any) => {
                    const total = (d.keyword_search ?? 0) + (d.keyword_plan ?? 0) + (d.backlink ?? 0) + (d.article ?? 0);
                    return (
                      <tr key={d.date} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-2 py-1">{new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</td>
                        <td className="px-2 py-1 text-right">{d.keyword_search ?? 0}</td>
                        <td className="px-2 py-1 text-right">{d.keyword_plan ?? 0}</td>
                        <td className="px-2 py-1 text-right">{d.backlink ?? 0}</td>
                        <td className="px-2 py-1 text-right">{d.article ?? 0}</td>
                        <td className="px-2 py-1 text-right font-bold">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent backlinks */}
      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-bold mb-4 flex items-center gap-2"><LinkIcon className="w-4 h-4 text-primary" /> Backlinks recentes</h2>
          <div className="space-y-1">
            {(data?.recentBacklinks ?? []).map((bl: any) => (
              <div key={bl.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/20 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  {bl.status === "published" && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                  {bl.status === "ready_for_review" && <FileText className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {bl.status === "queued" && <Clock className="w-3.5 h-3.5 text-primary shrink-0" />}
                  {bl.status === "generating" && <RefreshCw className="w-3.5 h-3.5 text-warning animate-spin shrink-0" />}
                  {bl.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="font-medium truncate">{bl.anchor_text}</span>
                  {bl.article_title && <span className="text-muted-foreground truncate ml-1 hidden sm:inline">— {bl.article_title}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {bl.error_message && <span className="text-[9px] text-destructive max-w-[150px] truncate hidden lg:inline" title={bl.error_message}>{bl.error_message}</span>}
                  <Badge variant={bl.status === "published" ? "success" : bl.status === "error" ? "error" : "pending"} className="text-[9px]">{bl.status}</Badge>
                  <span className="text-[9px] text-muted-foreground font-mono">{new Date(bl.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                </div>
              </div>
            ))}
            {(data?.recentBacklinks?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum backlink no período</p>}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(bl.errors > 0 || bl.queued > 3 || (data?.health?.inactive14d ?? 0) > 0) && (
        <Card className="border-warning/30">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold mb-2 flex items-center gap-2 text-warning"><AlertTriangle className="w-4 h-4" /> Alertas</h2>
            <div className="space-y-1 text-xs">
              {bl.errors > 0 && <p className="text-destructive">{bl.errors} backlink(s) com erro (total acumulado)</p>}
              {bl.queued > 3 && <p className="text-warning">{bl.queued} backlinks na fila</p>}
              {(data?.health?.inactive14d ?? 0) > 0 && <p className="text-warning">{data.health.inactive14d} usuário(s) ativo(s) sem uso há 14+ dias</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: any; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color ?? "text-muted-foreground"}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        </div>
        <p className={`text-xl font-black font-mono ${color ?? ""}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CostLine({ label, calls, usd }: { label: string; calls?: number; usd?: number }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label} <span className="font-mono text-[9px]">({calls ?? 0}x)</span></span>
      <span className="font-mono">${(usd ?? 0).toFixed(3)}</span>
    </div>
  );
}
