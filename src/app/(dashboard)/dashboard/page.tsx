"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles, Plus, Search, FileText, Link as LinkIcon,
  Check, ArrowRight, Loader2, Zap, Video, Globe, Users, Clock, Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUser } from "@/lib/hooks/use-user";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type RecentItem = {
  id: string;
  type: "backlink" | "article";
  title: string;
  status: string;
  created_at: string;
};

type ClubSession = {
  id: string;
  title: string;
  scheduled_at: string;
  status: "scheduled" | "live" | "completed";
  max_slots: number;
  candidates?: Array<{
    name: string;
    site: string;
    niche: string;
  }>;
};

type ClubStats = {
  analyses: number;
  sites: number;
  members: number;
  hours: number;
};

type TrendData = {
  date: string;
  count: number;
};

type AnchorDistribution = {
  name: string;
  value: number;
  color: string;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const { profile } = useUser();
  const { activeSite, sites, loading: sitesLoading } = useSite();
  const [stats, setStats] = useState({ keywords: 0, backlinks: 0, articles: 0 });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextSession, setNextSession] = useState<ClubSession | null>(null);
  const [clubStats, setClubStats] = useState<ClubStats>({ analyses: 0, sites: 0, members: 0, hours: 0 });
  const [keywordTrend, setKeywordTrend] = useState<TrendData[]>([]);
  const [backlinkTrend, setBacklinkTrend] = useState<TrendData[]>([]);
  const [articleTrend, setArticleTrend] = useState<TrendData[]>([]);
  const [recentCount, setRecentCount] = useState({ keywords: 0, backlinks: 0, articles: 0 });
  const [anchorDistribution, setAnchorDistribution] = useState<AnchorDistribution[]>([]);
  const [monthlyUsage, setMonthlyUsage] = useState({ backlinks: { used: 0, limit: 100 }, articles: { used: 0, limit: 100 } });
  const [applyOpen, setApplyOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteGoal, setSiteGoal] = useState("");

  const userName = profile?.name?.split(" ")[0] || profile?.email?.split("@")[0] || "";

  useEffect(() => {
    if (sitesLoading || !activeSite) { setLoading(false); return; }

    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

      const [
        { count: kwCount },
        { count: blCount },
        { count: artCount },
        { data: recentBl },
        { data: recentArt },
        { data: sessions },
        { data: replays },
        { count: profilesCount },
        { data: keywords },
        { data: backlinks },
        { data: articles },
        { data: profile },
        { count: blUsed },
        { count: artUsed },
      ] = await Promise.all([
        supabase.from("keywords").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id),
        supabase.from("backlinks").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id),
        supabase.from("backlinks").select("id, anchor_text, status, created_at").eq("client_site_id", activeSite.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("articles").select("id, title, status, created_at").eq("client_site_id", activeSite.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("club_sessions").select("id, title, scheduled_at, status, max_slots").eq("status", "scheduled").order("scheduled_at", { ascending: true }).limit(1),
        supabase.from("club_replays").select("id, site_analyzed, duration", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("keywords").select("id, created_at").eq("client_site_id", activeSite.id).order("created_at", { ascending: true }),
        supabase.from("backlinks").select("id, created_at, anchor_type").eq("client_site_id", activeSite.id).order("created_at", { ascending: true }),
        supabase.from("articles").select("id, created_at").eq("client_site_id", activeSite.id).order("created_at", { ascending: true }),
        supabase.from("profiles").select("credits_balance, plan_id").eq("id", user.id).single(),
        supabase.from("backlinks").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id).gte("created_at", startOfMonthStr),
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("client_site_id", activeSite.id).gte("created_at", startOfMonthStr),
      ]);

      setStats({
        keywords: kwCount ?? 0,
        backlinks: blCount ?? 0,
        articles: artCount ?? 0,
      });

      const merged: RecentItem[] = [
        ...(recentBl ?? []).map((b: any) => ({ id: b.id, type: "backlink" as const, title: b.anchor_text, status: b.status, created_at: b.created_at })),
        ...(recentArt ?? []).map((a: any) => ({ id: a.id, type: "article" as const, title: a.title || "Sem título", status: a.status, created_at: a.created_at })),
      ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

      setRecent(merged);

      // Process next session
      if (sessions && sessions.length > 0) {
        const session = sessions[0];
        const { data: candidates } = await supabase
          .from("club_candidates")
          .select("selected")
          .eq("session_id", session.id)
          .eq("selected", true);

        const selectedSites = candidates?.length ?? 0;
        setNextSession({
          ...session,
          candidates: Array.from({ length: selectedSites }).map(() => ({
            name: "Site candidato",
            site: "aguardando",
            niche: "em análise",
          })),
        });
      }

      // Process club stats
      setClubStats({
        analyses: replays?.length ?? 0,
        sites: new Set(replays?.map((r: any) => r.site_analyzed)).size,
        members: profilesCount ?? 0,
        hours: Math.floor((replays ?? []).reduce((acc: number, r: any) => {
          const dur = parseInt(r.duration) || 45;
          return acc + dur;
        }, 0) / 60),
      });

      // Process trends - last 30 days (cumulative total)
      const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);

      const buildCumulativeTrend = (items: any[]) => {
        const trend: TrendData[] = [];
        let cumulative = 0;
        for (let i = 0; i < 30; i++) {
          const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split("T")[0];
          // Count items created on this day and add to cumulative
          const dailyCount = items.filter((item) => item.created_at?.startsWith(dateStr)).length;
          cumulative += dailyCount;
          trend.push({
            date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            count: cumulative,
          });
        }
        return trend;
      };

      // Calculate recent count (last 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const countRecent = (items: any[]) => {
        return items.filter((item) => {
          const itemDate = new Date(item.created_at);
          return itemDate >= sevenDaysAgo;
        }).length;
      };

      setKeywordTrend(buildCumulativeTrend(keywords ?? []));
      setBacklinkTrend(buildCumulativeTrend(backlinks ?? []));
      setArticleTrend(buildCumulativeTrend(articles ?? []));
      setRecentCount({
        keywords: countRecent(keywords ?? []),
        backlinks: countRecent(backlinks ?? []),
        articles: countRecent(articles ?? []),
      });

      // Process anchor distribution
      if (backlinks && backlinks.length > 0) {
        const anchorCounts: Record<string, number> = { exact: 0, partial: 0, branded: 0, generic: 0, url: 0 };
        backlinks.forEach((bl: any) => {
          anchorCounts[bl.anchor_type] = (anchorCounts[bl.anchor_type] ?? 0) + 1;
        });
        const total = backlinks.length;
        setAnchorDistribution([
          { name: "Exata", value: Math.round((anchorCounts.exact / total) * 100), color: "hsl(24 100% 55%)" },
          { name: "Parcial", value: Math.round((anchorCounts.partial / total) * 100), color: "hsl(200 100% 50%)" },
          { name: "Marca", value: Math.round((anchorCounts.branded / total) * 100), color: "hsl(150 60% 45%)" },
          { name: "Genérica", value: Math.round((anchorCounts.generic / total) * 100), color: "hsl(280 60% 55%)" },
          { name: "URL", value: Math.round((anchorCounts.url / total) * 100), color: "hsl(0 0% 50%)" },
        ]);
      }

      // Process monthly usage
      const planLimits: Record<string, number> = { starter: 100, pro: 500, agency: 2000 };
      const planId = profile?.plan_id ?? "starter";
      const monthlyLimit = planLimits[planId] ?? 100;
      setMonthlyUsage({
        backlinks: { used: blUsed ?? 0, limit: monthlyLimit },
        articles: { used: artUsed ?? 0, limit: monthlyLimit },
      });

      setLoading(false);
    })();
  }, [activeSite, sitesLoading]);

  if (sitesLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEmpty = stats.keywords === 0 && stats.backlinks === 0 && stats.articles === 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-display)] tracking-tight">
          {getGreeting()}{userName ? `, ${userName}` : ""}!
        </h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed">
          {isEmpty
            ? "Vamos posicionar seu site no Google."
            : "Aqui está como o seu site está indo."}
        </p>
      </div>

      {/* KPIs com sparklines */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCardWithTrend
          icon={Search}
          label="Palavras"
          subtitle="Termos que quer rankear"
          value={stats.keywords}
          href="/palavras"
          color="text-primary"
          trend={keywordTrend}
          recentCount={recentCount.keywords}
        />
        <KpiCardWithTrend
          icon={LinkIcon}
          label="Backlinks"
          subtitle="Links em sites parceiros"
          value={stats.backlinks}
          href="/backlinks"
          color="text-info"
          trend={backlinkTrend}
          recentCount={recentCount.backlinks}
        />
        <KpiCardWithTrend
          icon={FileText}
          label="Artigos"
          subtitle="Conteúdos publicados"
          value={stats.articles}
          href="/articles"
          color="text-success"
          trend={articleTrend}
          recentCount={recentCount.articles}
        />
      </div>

      {/* Créditos do Mês */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-base font-bold">Créditos do mês</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Backlinks usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Backlinks</span>
                    <span className="text-xs font-mono font-bold text-info">
                      {monthlyUsage.backlinks.used}/{monthlyUsage.backlinks.limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted border border-border">
                    <div
                      className="h-2 rounded-full bg-info transition-all shadow-lg"
                      style={{ width: `${Math.min(100, (monthlyUsage.backlinks.used / monthlyUsage.backlinks.limit) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* Artigos usage */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Artigos</span>
                    <span className="text-xs font-mono font-bold text-success">
                      {monthlyUsage.articles.used}/{monthlyUsage.articles.limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted border border-border">
                    <div
                      className="h-2 rounded-full bg-success transition-all shadow-lg"
                      style={{ width: `${Math.min(100, (monthlyUsage.articles.used / monthlyUsage.articles.limit) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Cada backlink ou artigo consome 1 crédito do seu plano
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Link href="/palavras" className="flex-1">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Plus className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">Nova Palavra</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Adicione termos ao seu plano</p>
                </div>
              </Link>
              <Link href="/backlinks" className="flex-1">
                <div className="p-3 rounded-lg bg-info/10 border border-info/20 hover:border-info/40 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="w-4 h-4 text-info" />
                    <span className="text-sm font-bold text-info">Novo Backlink</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Crie links em sites parceiros</p>
                </div>
              </Link>
              <Link href="/articles" className="flex-1">
                <div className="p-3 rounded-lg bg-success/10 border border-success/20 hover:border-success/40 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-success" />
                    <span className="text-sm font-bold text-success">Novo Artigo</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Publique conteúdos no seu site</p>
                </div>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Club + Distribuição de Âncoras lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Club */}
        {nextSession && (
          <Card>
            <CardContent className="p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-primary" />
                    <h3 className="text-base font-bold">Club 8links</h3>
                  </div>
                  <Link href="/courses">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      <Video className="w-3.5 h-3.5" /> Ver Replay
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">Análises semanais ao vivo dos projetos dos membros</p>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-destructive/10 to-transparent p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-xs font-semibold text-destructive uppercase tracking-wider font-mono">Próxima sessão ao vivo</span>
                </div>
                <h3 className="text-2xl font-extrabold font-[family-name:var(--font-display)] tracking-tight mb-1">
                  {new Date(nextSession.scheduled_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextSession.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {nextSession.candidates?.length ?? 0}/{nextSession.max_slots} vagas disponíveis
                </p>
              </div>

              <Button className="w-full gap-2" size="lg" onClick={() => setApplyOpen(true)}>
                <Send className="w-4 h-4" /> Candidatar meu site
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Distribuição de Âncoras */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold">Distribuição de Âncoras</h3>
              </div>
              <p className="text-xs text-muted-foreground">Tipos de texto âncora usados</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={anchorDistribution}
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {anchorDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {anchorDistribution.map((anchor) => (
                  <div key={anchor.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: anchor.color }}
                    />
                    <span className="text-xs text-muted-foreground flex-1">{anchor.name}</span>
                    <span className="text-xs font-mono font-semibold">{anchor.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Atividade Recente */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-base font-bold">Atividade recente</h3>
            </div>
            <p className="text-xs text-muted-foreground">Últimos backlinks e artigos criados</p>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-base text-muted-foreground mb-1">Nada por aqui ainda</p>
              <p className="text-sm text-muted-foreground">Os backlinks e artigos que você criar aparecem aqui.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recent.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-3 py-3 rounded-lg hover:bg-muted/30">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    item.type === "backlink" ? "bg-info-light text-info" : "bg-success-light text-success"
                  }`}>
                    {item.type === "backlink" ? <LinkIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.type === "backlink" ? "Backlink" : "Artigo"} · {translateStatus(item.status)} · {timeAgo(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Candidatura - mesmo da pagina /courses */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar meu site para análise</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo. Nossa equipe selecionará até 5 sites por sessão. Você será notificado se for escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do site</Label>
              <Input placeholder="https://meusite.com.br" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>O que você quer melhorar?</Label>
              <Textarea
                placeholder="Ex: quero mais tráfego orgânico, não sei se meus backlinks estão funcionando..."
                rows={4}
                value={siteGoal}
                onChange={(e) => setSiteGoal(e.target.value)}
              />
            </div>
            <div className="bg-primary-light rounded-xl p-4 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Como funciona:</span> A análise é feita ao vivo pela nossa equipe.
                Vamos revisar seu site, backlinks, keywords, conteúdo, e dar recomendações práticas.
                A gravação fica disponível nos replays para todos os membros.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button>
            <Button onClick={handleApply}>
              <Send className="w-4 h-4" /> Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, href, color }: {
  icon: any; label: string; value: number; href: string; color: string;
}) {
  return (
    <Link href={href}>
      <Card className="card-interactive hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono font-semibold">{label}</span>
            </div>
          </div>
          <p className={`text-2xl font-extrabold font-[family-name:var(--font-display)] ${color}`}>{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function KpiCardWithTrend({ icon: Icon, label, subtitle, value, href, color, trend, recentCount }: {
  icon: any; label: string; subtitle: string; value: number; href: string; color: string; trend: TrendData[]; recentCount: number;
}) {
  const strokeColor = color.includes("primary") ? "hsl(24 100% 55%)" : color.includes("info") ? "hsl(200 100% 50%)" : "hsl(150 60% 45%)";
  const gradientId = `gradient-${label.replace(/\s/g, '')}`;

  return (
    <Link href={href}>
      <Card className="card-interactive hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono font-semibold">{label}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-3">{subtitle}</p>
          <div className="flex items-end justify-between mb-2">
            <p className={`text-3xl font-extrabold font-[family-name:var(--font-display)] ${color}`}>{value}</p>
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{recentCount}</span> nos últimos 7 dias
            </div>
          </div>
          <div className="w-full h-14">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ChecklistItem({ done, label, href }: { done: boolean; label: string; href?: string }) {
  const inner = (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${href && !done ? "hover:bg-muted/30 cursor-pointer" : ""}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
        done ? "bg-success/15 text-success" : "border-2 border-border"
      }`}>
        {done && <Check className="w-3.5 h-3.5" />}
      </div>
      <span className={`text-sm flex-1 ${done ? "text-muted-foreground line-through" : "font-medium"}`}>
        {label}
      </span>
      {!done && href && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
    </div>
  );
  return href && !done ? <Link href={href}>{inner}</Link> : inner;
}

function translateStatus(s: string): string {
  const map: Record<string, string> = {
    queued: "Na fila",
    generating: "Gerando",
    ready_for_review: "Aguardando aprovação",
    published: "Publicado",
    indexed: "Indexado",
    error: "Erro",
    draft: "Rascunho",
    optimizing: "Otimizando",
    ready: "Pronto",
    scheduled: "Agendado",
  };
  return map[s] ?? s;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

async function handleApply() {
  if (!siteUrl.trim() || !siteGoal.trim()) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { toast.error("Faça login para se candidatar."); return; }
  const sessionId = nextSession?.id;
  if (!sessionId) { toast.error("Nenhuma sessão disponível."); return; }
  const { error } = await supabase
    .from("club_candidates")
    .insert({ session_id: sessionId, user_id: user.id, client_site_id: activeSite?.id, goal: siteGoal });
  if (error) { toast.error("Erro ao enviar candidatura."); return; }
  setApplyOpen(false);
  toast.success("Candidatura enviada!");
  setSiteUrl("");
  setSiteGoal("");
}
