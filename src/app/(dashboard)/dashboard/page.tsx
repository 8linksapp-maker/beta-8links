"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Link as LinkIcon, Globe, TrendingUp, Zap,
  ArrowRight, Target, Sparkles, Rocket, Search,
  BarChart3, ExternalLink, ArrowUpRight, ArrowDownRight,
  FileText, Eye, MousePointerClick, DollarSign,
  Users, Lightbulb,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/hooks/use-user";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

/* ─── Constants ─── */

const NICHE_CPC: Record<string, number> = {
  "Saúde": 2.8, "Tecnologia": 3.5, "Finanças": 4.2, "Educação": 2.1,
  "E-commerce": 1.8, "Jurídico": 5.0, "Imobiliário": 3.8, "Marketing": 3.2,
  "Alimentação": 1.5, "Automotivo": 2.0, "Moda": 1.4, "Beleza": 1.8,
  "Esportes": 1.6, "Viagem": 2.2, "Jogos": 1.3, "Pets": 1.5,
  default: 2.5,
};

/* ─── Helpers ─── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDate(d: string) {
  if (!d) return "";
  const clean = d.replace(/-/g, "");
  if (clean.length === 8) return `${clean.slice(6, 8)}/${clean.slice(4, 6)}`;
  return d;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur-sm p-3 shadow-xl ring-1 ring-primary/10">
      <p className="text-xs font-mono text-muted-foreground mb-1.5">{formatDate(label)}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold font-mono">{Number(p.value).toLocaleString("pt-BR")}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */

export default function DashboardPage() {
  const { profile } = useUser();
  const { activeSite, activeSiteId, sites: ctxSites, loading: siteLoading } = useSite();
  const [loading, setLoading] = useState(true);

  // Data states
  const [gscData, setGscData] = useState<any>(null);
  const [gaData, setGaData] = useState<any>(null);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [keywordChanges, setKeywordChanges] = useState<any>(null);
  const [backlinksCount, setBacklinksCount] = useState(0);
  const [keywordsCount, setKeywordsCount] = useState(0);
  const [recentBacklinks, setRecentBacklinks] = useState<any[]>([]);
  const [blDomainFilter, setBlDomainFilter] = useState<"br" | "all">("br");
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [chartPeriod, setChartPeriod] = useState(90);

  const userName = profile?.name?.split(" ")[0] || profile?.email?.split("@")[0] || "Usuário";

  // ── Load all dashboard data ──
  const loadData = useCallback(async () => {
    if (!activeSiteId) return;
    setLoading(true);

    const supabase = createClient();

    // Parallel DB queries — no API calls, all from cache
    const [blSumRes, kwCountRes, recentBlRes, recentArtRes, createdBlRes] = await Promise.all([
      supabase.from("external_backlinks").select("backlink_count").eq("client_site_id", activeSiteId),
      supabase.from("keywords").select("id", { count: "exact", head: true }).eq("client_site_id", activeSiteId),
      supabase.from("external_backlinks").select("domain_from, authority_points, anchor, dofollow, last_seen").eq("client_site_id", activeSiteId).order("last_seen", { ascending: false, nullsFirst: false }).limit(30),
      supabase.from("articles").select("id, title, status, created_at").eq("client_site_id", activeSiteId).order("created_at", { ascending: false }).limit(5),
      supabase.from("backlinks").select("id, target_url, anchor_text, status, created_at, network_site_id").eq("client_site_id", activeSiteId).order("created_at", { ascending: false }).limit(10),
    ]);

    // Sum individual backlink counts from all domains
    const totalBl = (blSumRes.data ?? []).reduce((s: number, r: any) => s + (r.backlink_count ?? 1), 0);
    setBacklinksCount(totalBl);
    setKeywordsCount(kwCountRes.count ?? 0);
    setRecentBacklinks(recentBlRes.data ?? []);
    setRecentArticles([...(recentArtRes.data ?? []), ...(createdBlRes.data ?? []).map((bl: any) => ({ id: bl.id, title: `Backlink: ${bl.anchor_text}`, status: bl.status, created_at: bl.created_at, type: "backlink", target_url: bl.target_url }))]);

    // Parallel API calls (only if Google connected)
    const apiCalls: Promise<void>[] = [];

    if (activeSite?.google_refresh_token && activeSite?.gsc_site_url) {
      apiCalls.push(
        fetch(`/api/integrations/gsc-data?siteId=${activeSiteId}&period=${chartPeriod}`).then(r => r.json()).then(d => { if (!d.error) setGscData(d); }).catch(() => {}),
        fetch(`/api/integrations/gsc-pages?siteId=${activeSiteId}&period=${chartPeriod}`).then(r => r.json()).then(d => { if (!d.error && d.pages) setTopPages(d.pages); }).catch(() => {}),
        fetch(`/api/integrations/gsc-keyword-changes?siteId=${activeSiteId}`).then(r => r.json()).then(d => { if (!d.error) setKeywordChanges(d); }).catch(() => {}),
      );
    }

    if (activeSite?.google_refresh_token && activeSite?.ga_property_id) {
      apiCalls.push(
        fetch(`/api/integrations/ga-data?siteId=${activeSiteId}&period=30`).then(r => r.json()).then(d => { if (!d.error) setGaData(d); }).catch(() => {}),
      );
    }

    await Promise.all(apiCalls);
    setLoading(false);
  }, [activeSiteId, activeSite, chartPeriod]);

  useEffect(() => {
    if (siteLoading) return;
    setGscData(null); setGaData(null); setTopPages([]); setKeywordChanges(null);
    setBacklinksCount(0); setKeywordsCount(0); setRecentBacklinks([]); setRecentArticles([]);
    if (activeSiteId) loadData();
    else setLoading(false);
  }, [activeSiteId, siteLoading, loadData]);

  // ── Derived values ──
  const hasSites = ctxSites.length > 0;
  const totalClicks = gscData?.totals?.clicks ?? 0;
  const totalImpressions = gscData?.totals?.impressions ?? 0;
  const totalTraffic = gaData?.totals?.sessions ?? totalClicks;
  const totalKeywords = gscData?.totals?.totalKeywords ?? keywordsCount;
  const kwsTop10 = gscData?.totals?.inTop10 ?? 0;
  const ap = activeSite?.da_current ?? 0;
  const nicheCPC = (activeSite as any)?.avg_cpc > 0 ? (activeSite as any).avg_cpc : (NICHE_CPC[activeSite?.niche_primary ?? "default"] ?? NICHE_CPC.default);
  const trafficValue = Math.round(totalClicks * nicheCPC);

  const chartData = gscData?.daily?.map((d: any) => ({
    date: d.date,
    cliques: d.clicks,
    impressoes: d.impressions,
  })) ?? [];

  // ── Loading ──
  if (siteLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  // ── Empty state ──
  if (!hasSites) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">{getGreeting()}, {userName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">Vamos configurar seu piloto automático de SEO.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-shine rounded-2xl border bg-card p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,hsl(24_100%_55%/0.06),transparent_60%)] pointer-events-none" />
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-[hsl(35,100%,60%)] flex items-center justify-center mx-auto mb-6 shadow-[0_0_48px_hsl(24_100%_55%/0.3)]">
              <Rocket className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">
              Ative seu <span className="text-gradient">Piloto Automático</span>
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Cadastre seu site, conecte o Google e o 8links cuida do resto — backlinks, monitoramento e relatórios no automático.
            </p>
            <Link href="/onboarding">
              <button className="btn-glow rounded-xl px-10 py-4 text-base font-bold inline-flex items-center gap-2 cursor-pointer">
                <Sparkles className="w-5 h-5" /> Começar Configuração
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">
          {getGreeting()}, {userName}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeSite?.url?.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </p>
      </motion.div>

      {/* Economia com tráfego — destaque */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
        <Card className="bg-gradient-to-r from-primary/10 via-card to-primary/5 border-primary/20 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Seu tráfego orgânico vale</p>
                  <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-gradient">
                    R$ {trafficValue > 0 ? <NumberTicker value={trafficValue} /> : "0"}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/{chartPeriod}d</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono"><NumberTicker value={totalClicks} /></p>
                  <p className="text-[10px] text-muted-foreground">Cliques</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">R$ {nicheCPC.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">CPC médio</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold font-mono">{gscData?.totals?.avgPosition ? Math.round(gscData.totals.avgPosition) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Posição média</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="DA" value={ap} icon={TrendingUp} />
        <MetricCard label="Backlinks" value={backlinksCount} icon={LinkIcon} />
        <MetricCard label="Keywords" value={totalKeywords} icon={Target} />
        <MetricCard label="Cliques" value={totalClicks} icon={MousePointerClick} />
      </motion.div>

      {/* Chart — Cliques + Impressões 90 dias */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Desempenho no Google</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border overflow-hidden">
                  {[30, 60, 90].map(p => (
                    <button key={p} onClick={() => setChartPeriod(p)}
                      className={`px-2.5 py-1 text-[10px] font-semibold font-mono transition-colors cursor-pointer ${chartPeriod === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {p}d
                    </button>
                  ))}
                </div>
                {gscData && <Badge variant="outline" className="text-[10px] font-mono">{gscData.totals?.clicks?.toLocaleString()} cliques</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 10%, 12%)" vertical={false} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 10, fontFamily: 'var(--font-mono)' }} tickFormatter={formatDate} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="cliques" stroke="hsl(24, 100%, 55%)" strokeWidth={2} fill="url(#gradClicks)" name="Cliques" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                {activeSite?.gsc_site_url ? "Carregando dados do Search Console..." : "Conecte o Google Search Console para ver o gráfico"}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Pages + Autopilot Feed */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Top Pages (3/5) */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Páginas mais acessadas — {chartPeriod} dias</CardTitle>
              {topPages.length > 0 && <Badge variant="outline" className="text-[10px] font-mono">{topPages.length} páginas</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {topPages.length > 0 ? (
              <div className="space-y-1">
                {topPages.slice(0, 8).map((page: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                      <a href={page.page} target="_blank" rel="noopener noreferrer" className="text-sm truncate hover:text-primary transition-colors">
                        {page.path}
                        <ExternalLink className="w-2.5 h-2.5 inline ml-1 opacity-40" />
                      </a>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-primary">{page.clicks}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">cliques</span>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-mono text-muted-foreground">{page.impressions.toLocaleString()} imp</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Conecte o Search Console para ver as páginas</p>
            )}
          </CardContent>
        </Card>

        {/* Autopilot Feed (2/5) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Atividade do Autopilot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBacklinks.length === 0 && recentArticles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">O autopilot está configurando. As atividades aparecerão aqui.</p>
              ) : (
                <>
                  {recentBacklinks.slice(0, 3).map((bl: any, i: number) => (
                    <div key={`bl-${i}`} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <LinkIcon className="w-3 h-3 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium">Backlink de <span className="font-semibold text-primary">{bl.domain_from}</span></p>
                        <p className="text-[10px] text-muted-foreground font-mono">DA {bl.authority_points} · {bl.dofollow ? "dofollow" : "nofollow"}</p>
                      </div>
                    </div>
                  ))}
                  {recentArticles.slice(0, 5).map((art: any, i: number) => (
                    <div key={`art-${i}`} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${art.type === "backlink" ? "bg-primary/10" : "bg-success/10"}`}>
                        {art.type === "backlink" ? <LinkIcon className="w-3 h-3 text-primary" /> : <FileText className="w-3 h-3 text-success" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{art.title ?? "Artigo"}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {art.status === "queued" ? "⏳ Na fila" : art.status === "generating" ? "⚙️ Gerando artigo" : art.status === "published" ? "✅ Publicado" : art.status ?? "rascunho"}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Keywords Movement + Opportunities + Recent Backlinks */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Keywords subindo/descendo */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Keywords em movimento</CardTitle>
              <Link href="/keywords"><Button variant="ghost" size="sm" className="text-xs h-7">Ver todas <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent>
            {keywordChanges ? (
              <div className="space-y-3">
                {keywordChanges.movedUp?.slice(0, 5).map((kw: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs truncate flex-1">{kw.keyword}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ArrowUpRight className="w-3 h-3 text-success" />
                      <span className="text-xs font-mono font-bold text-success">+{Math.round(kw.change)}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">#{Math.round(kw.position)}</span>
                    </div>
                  </div>
                ))}
                {keywordChanges.movedDown?.slice(0, 3).map((kw: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs truncate flex-1">{kw.keyword}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ArrowDownRight className="w-3 h-3 text-destructive" />
                      <span className="text-xs font-mono font-bold text-destructive">{Math.round(kw.change)}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">#{Math.round(kw.position)}</span>
                    </div>
                  </div>
                ))}
                {(keywordChanges.movedUp?.length === 0 && keywordChanges.movedDown?.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem mudanças significativas este mês</p>
                )}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">{keywordChanges.totalUp} subiram · {keywordChanges.totalDown} desceram</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">Conecte o Search Console</p>
            )}
          </CardContent>
        </Card>

        {/* Oportunidades */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-warning" /> Oportunidades</CardTitle>
          </CardHeader>
          <CardContent>
            {keywordChanges?.opportunities?.length > 0 ? (
              <div className="space-y-3">
                {keywordChanges.opportunities.map((kw: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-warning/5 border border-warning/10">
                    <p className="text-xs font-medium">{kw.keyword}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Posição <span className="font-mono font-bold text-warning">#{Math.round(kw.position)}</span> · {kw.clicks} cliques
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">Quase na página 1 — um backlink pode ajudar</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-6">
                {keywordChanges ? "Nenhuma oportunidade detectada" : "Conecte o Search Console"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Backlinks recentes */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Backlinks recentes</CardTitle>
              <div className="flex items-center rounded-md border border-border overflow-hidden">
                <button onClick={() => setBlDomainFilter("br")} className={`px-2 py-1 text-[9px] font-semibold transition-colors cursor-pointer ${blDomainFilter === "br" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>.com.br</button>
                <button onClick={() => setBlDomainFilter("all")} className={`px-2 py-1 text-[9px] font-semibold transition-colors cursor-pointer ${blDomainFilter === "all" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Todos</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const filtered = blDomainFilter === "br"
                ? recentBacklinks.filter((bl: any) => bl.domain_from?.endsWith(".br"))
                : recentBacklinks;
              const display = filtered.slice(0, 5);
              return display.length > 0 ? (
                <div className="space-y-2">
                  {display.map((bl: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{bl.domain_from}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{bl.anchor || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-mono font-bold ${bl.authority_points >= 30 ? 'text-success' : bl.authority_points >= 10 ? 'text-primary' : 'text-muted-foreground'}`}>
                          DA {bl.authority_points}
                        </span>
                        <Badge variant={bl.dofollow ? "default" : "outline"} className={`text-[9px] px-1.5 ${bl.dofollow ? 'bg-success/15 text-success border-success/30' : 'text-muted-foreground'}`}>
                          {bl.dofollow ? "df" : "nf"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {blDomainFilter === "br" ? "Nenhum backlink .com.br — clique em \"Todos\"" : "Backlinks aparecerão aqui"}
                </p>
              );
            })()}
            <Link href="/backlinks" className="block mt-3">
              <Button variant="outline" size="sm" className="w-full text-xs">Ver todos os backlinks <ArrowRight className="w-3 h-3" /></Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  );
}
