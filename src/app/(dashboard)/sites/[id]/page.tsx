"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Globe, TrendingUp, Link as LinkIcon, FileText,
  Search, Zap, Settings, ExternalLink, Target, BarChart3,
  CheckCircle2, AlertTriangle, Bot, Plug, Check, Loader2, GitBranch,
  Filter, ArrowUpDown, ArrowDown, ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Progress } from "@/components/ui/progress";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";

// siteData is loaded from realSite (DB) — see useEffect below

// Mock data removed — uses real data from DB (siteBacklinks, siteKeywords, gscData)

export default function SiteDetailPage() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");

  // Real site data from DB
  const [realSite, setRealSite] = useState<any>(null);

  // Integration states
  const [googleProps, setGoogleProps] = useState<any[]>([]);
  const [gscSites, setGscSites] = useState<any[]>([]);
  const [selectedGA, setSelectedGA] = useState("");
  const [selectedGSC, setSelectedGSC] = useState("");
  const [loadingProps, setLoadingProps] = useState(false);
  const [wpUrl, setWpUrl] = useState("");
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpTesting, setWpTesting] = useState(false);
  const [wpTestResult, setWpTestResult] = useState<any>(null);
  const [wpSaving, setWpSaving] = useState(false);

  // Related data
  const [siteKeywords, setSiteKeywords] = useState<any[]>([]);
  const [siteBacklinks, setSiteBacklinks] = useState<any[]>([]);
  const [siteArticles, setSiteArticles] = useState<any[]>([]);
  const [gaData, setGaData] = useState<any>(null);
  const [gscData, setGscData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [externalBacklinks, setExternalBacklinks] = useState<any[]>([]);
  const [totalExternalBacklinks, setTotalExternalBacklinks] = useState(0);
  const [githubArticles, setGithubArticles] = useState<any[]>([]);

  // GitHub repo selector
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [savingRepo, setSavingRepo] = useState(false);

  // Backlinks pagination + filters
  const [blPage, setBlPage] = useState(0);
  const BL_PER_PAGE = 15;

  // Keywords pagination
  const [kwPage, setKwPage] = useState(0);
  const KW_PER_PAGE = 20;
  const [blFilterType, setBlFilterType] = useState<"all" | "dofollow" | "nofollow">("dofollow");
  const [blSortDir, setBlSortDir] = useState<"desc" | "asc">("desc");
  const [blAnchorSearch, setBlAnchorSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Load site
      const { data } = await supabase.from("client_sites").select("*").eq("id", id).single();
      if (data) {
        setRealSite(data);
        if (data.ga_property_id) setSelectedGA(data.ga_property_id);
        if (data.gsc_site_url) setSelectedGSC(data.gsc_site_url);
      }

      // Load related data in parallel
      const [kwRes, blRes, artRes] = await Promise.all([
        supabase.from("keywords").select("*").eq("client_site_id", id).order("search_volume", { ascending: false }),
        supabase.from("backlinks").select("*, network_sites(domain, niche, da)").eq("client_site_id", id).order("created_at", { ascending: false }).limit(10),
        supabase.from("articles").select("*").eq("client_site_id", id).order("created_at", { ascending: false }).limit(10),
      ]);

      console.log("[SiteDetail] DB keywords:", kwRes.data?.length ?? 0, "error:", kwRes.error?.message);
      console.log("[SiteDetail] DB backlinks:", blRes.data?.length ?? 0);
      console.log("[SiteDetail] DB articles:", artRes.data?.length ?? 0);
      setSiteKeywords(kwRes.data ?? []);
      setSiteBacklinks(blRes.data ?? []);
      setSiteArticles(artRes.data ?? []);

      // Load Google data if connected
      if (data?.google_refresh_token && data?.gsc_site_url) {
        try {
          const gscRes = await fetch(`/api/integrations/gsc-data?siteId=${id}&period=90`);
          const gsc = await gscRes.json();
          console.log("[SiteDetail] GSC data:", { clicks: gsc?.totals?.clicks, keywords: gsc?.totals?.totalKeywords, error: gsc?.error });
          if (!gsc.error) setGscData(gsc);
        } catch (e) { console.error("[SiteDetail] GSC fetch error:", e); }
      } else {
        console.log("[SiteDetail] GSC not loaded:", { hasToken: !!data?.google_refresh_token, gscUrl: data?.gsc_site_url });
      }
      if (data?.google_refresh_token && data?.ga_property_id) {
        try {
          const gaRes = await fetch(`/api/integrations/ga-data?siteId=${id}&period=30`);
          const ga = await gaRes.json();
          console.log("[SiteDetail] GA data:", { sessions: ga?.totals?.sessions, error: ga?.error });
          if (!ga.error) setGaData(ga);
        } catch (e) { console.error("[SiteDetail] GA fetch error:", e); }
      } else {
        console.log("[SiteDetail] GA not loaded:", { hasToken: !!data?.google_refresh_token, gaProperty: data?.ga_property_id });
      }

      // Load external backlinks (from DB cache, only calls DataForSEO on first load)
      try {
        const blRes = await fetch(`/api/integrations/external-backlinks?siteId=${id}`);
        const bl = await blRes.json();
        console.log("[SiteDetail] Backlinks:", { total: bl?.totalBacklinks, domains: bl?.totalDomains, source: bl?.source, error: bl?.error });
        if (!bl.error && bl.backlinks) {
          setExternalBacklinks(bl.backlinks);
          setTotalExternalBacklinks(bl.totalBacklinks ?? bl.backlinks.length);
        }
      } catch {}

      // Load content from GitHub if connected + repo selected
      if (data?.github_token && data?.github_repo) {
        try {
          const ghRes = await fetch(`/api/integrations/github-content?siteId=${id}`);
          const gh = await ghRes.json();
          console.log("[SiteDetail] GitHub content:", { articles: gh?.articles?.length, repo: gh?.repo, error: gh?.error });
          if (!gh.error && gh.articles) setGithubArticles(gh.articles);
        } catch {}
      } else if (data?.github_token && !data?.github_repo) {
        // Auto-load repos so user can pick one
        try {
          const reposRes = await fetch(`/api/integrations/github-repos?siteId=${id}`);
          const reposData = await reposRes.json();
          if (reposData.repos) setGithubRepos(reposData.repos);
          // Auto-switch to integrations tab so user picks a repo
          setTab("integrations");
        } catch {}
      }

      setLoadingData(false);
    }
    load();
  }, [id]);

  const loadGoogleProps = async () => {
    setLoadingProps(true);
    try {
      const res = await fetch(`/api/integrations/google-properties?siteId=${id}`);
      const data = await res.json();
      if (data.gaProperties) setGoogleProps(data.gaProperties);
      if (data.gscSites) setGscSites(data.gscSites);
    } catch {}
    setLoadingProps(false);
  };

  const saveGoogleSelection = async () => {
    await fetch("/api/integrations/google-properties", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: id, gaPropertyId: selectedGA || null, gscSiteUrl: selectedGSC || null }),
    });
    setRealSite((prev: any) => ({ ...prev, ga_property_id: selectedGA, gsc_site_url: selectedGSC }));
    toast.success("Propriedades Google salvas!");
  };

  const testWp = async () => {
    setWpTesting(true); setWpTestResult(null);
    try {
      const res = await fetch("/api/integrations/test-wordpress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }) });
      setWpTestResult(await res.json());
    } catch { setWpTestResult({ error: "Erro" }); }
    setWpTesting(false);
  };

  const saveWp = async () => {
    setWpSaving(true);
    const res = await fetch("/api/integrations/save-wordpress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId: id, wpUrl, wpUsername: wpUser, wpAppPassword: wpPass }) });
    const data = await res.json();
    if (data.success) { setRealSite((prev: any) => ({ ...prev, wp_url: wpUrl })); toast.success("WordPress conectado!"); }
    else toast.error(data.error);
    setWpSaving(false);
  };

  // Derive display data from realSite + related data
  // Use GSC keywords if available (live, 90 days), otherwise DB keywords
  const allKeywords = gscData?.keywords ?? siteKeywords;
  const kwsTop10 = gscData?.totals?.inTop10 ?? siteKeywords.filter(k => k.position_current && k.position_current <= 10).length;
  const totalTraffic = gaData?.totals?.sessions ?? gscData?.totals?.clicks ?? 0;

  const siteData = {
    url: realSite?.url?.replace(/^https?:\/\//, "") ?? "Carregando...",
    niche: realSite?.niche_primary ?? "—",
    da: realSite?.da_current ?? 0,
    daHistory: realSite?.da_history ?? [],
    seoScore: realSite?.seo_score ?? 0,
    phase: realSite?.phase ?? "planting",
    autopilot: realSite?.autopilot_active ?? true,
    backlinks: totalExternalBacklinks || siteBacklinks.length,
    keywords: allKeywords.length,
    keywordsTop10: kwsTop10,
    traffic: totalTraffic,
    articles: githubArticles.length || siteArticles.length,
  };

  // Load GitHub repos for selector
  const loadGithubRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`/api/integrations/github-repos?siteId=${id}`);
      const data = await res.json();
      if (data.repos) setGithubRepos(data.repos);
    } catch {}
    setLoadingRepos(false);
  };

  // Save selected GitHub repo and reload content
  const saveGithubRepo = async (repoFullName: string) => {
    setSavingRepo(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("client_sites").update({ github_repo: repoFullName }).eq("id", id);
    if (updateError) {
      console.error("[SiteDetail] GitHub repo save error:", updateError);
      toast.error("Erro ao salvar repositório");
      setSavingRepo(false);
      return;
    }
    console.log("[SiteDetail] GitHub repo saved:", repoFullName);
    setRealSite((prev: any) => ({ ...prev, github_repo: repoFullName }));
    // Load content from the selected repo
    try {
      const ghRes = await fetch(`/api/integrations/github-content?siteId=${id}`);
      const gh = await ghRes.json();
      console.log("[SiteDetail] GitHub content after save:", { articles: gh?.articles?.length, error: gh?.error });
      if (!gh.error && gh.articles) setGithubArticles(gh.articles);
    } catch (e) { console.error("[SiteDetail] GitHub content fetch error:", e); }
    setSavingRepo(false);
    toast.success("Repositório selecionado!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/sites" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Meus Sites
        </Link>
        <div className="page-header">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title">{siteData.url}</h1>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <Badge variant="outline" className="text-xs">{siteData.niche}</Badge>
              <StatusTag status="active" label="Crescendo" />
              {siteData.autopilot && (
                <span className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <Zap className="w-3 h-3" /> Autopilot ativo
                </span>
              )}
            </div>
          </div>
          <Button variant="outline"><Settings className="w-4 h-4" /> Configurar</Button>
        </div>
      </motion.div>

      {/* Score + KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-beam relative overflow-hidden p-5">
          <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-primary/5 blur-2xl" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-1">Score SEO</p>
          <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-gradient relative"><NumberTicker value={siteData.seoScore} /></p>
          <p className="text-[10px] text-muted-foreground font-mono">/100</p>
        </Card>
        {[
          { label: "Authority", value: siteData.da, icon: TrendingUp, change: "+3" },
          { label: "Backlinks", value: siteData.backlinks, icon: LinkIcon, change: "+12%" },
          { label: "Keywords", value: siteData.keywords, icon: Target },
          { label: gaData ? "Sessões" : "Cliques", value: siteData.traffic, icon: Globe, suffix: gaData ? "/mês" : "/mês" },
        ].map((kpi, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
              <NumberTicker value={kpi.value} />{kpi.suffix && <span className="text-sm text-muted-foreground">{kpi.suffix}</span>}
            </p>
            {kpi.change && <p className="text-xs text-success font-semibold font-mono mt-0.5">{kpi.change}</p>}
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {/* DA Evolution */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução da Autoridade</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={siteData.daHistory}>
                      <defs>
                        <linearGradient id="gradDa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 10%, 12%)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                      <RechartsTooltip contentStyle={{ background: 'hsl(20, 12%, 7%)', border: '1px solid hsl(20, 10%, 18%)', borderRadius: '10px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="da" stroke="hsl(24, 100%, 55%)" strokeWidth={2.5} fill="url(#gradDa)" name="DA" dot={false} activeDot={{ r: 4, fill: 'hsl(24, 100%, 55%)', stroke: 'hsl(20, 12%, 7%)', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Phase + Progress */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Fase do Site</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "Plantando", done: true, desc: "Backlinks sendo criados" },
                    { label: "Germinando", done: true, desc: "Google indexando" },
                    { label: "Crescendo", done: false, active: true, desc: "Rankings subindo" },
                    { label: "Colhendo", done: false, desc: "Resultados consistentes" },
                  ].map((phase, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${phase.done ? 'bg-success/20' : phase.active ? 'bg-primary/20 ring-2 ring-primary/30' : 'bg-muted'}`}>
                        {phase.done ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : phase.active ? <div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${phase.active ? 'text-primary' : phase.done ? '' : 'text-muted-foreground'}`}>{phase.label}</p>
                        <p className="text-xs text-muted-foreground">{phase.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="backlinks">
            <div className="space-y-4 mt-4">
              {externalBacklinks.length > 0 && (() => {
                // Filter + sort
                const filtered = externalBacklinks
                  .filter((bl: any) => {
                    if (blFilterType === "dofollow" && !bl.dofollow) return false;
                    if (blFilterType === "nofollow" && bl.dofollow) return false;
                    if (blAnchorSearch) {
                      const search = blAnchorSearch.toLowerCase();
                      if (!(bl.anchor ?? "").toLowerCase().includes(search) && !(bl.linkContext ?? "").toLowerCase().includes(search)) return false;
                    }
                    return true;
                  })
                  .sort((a: any, b: any) => blSortDir === "desc" ? b.daScore - a.daScore : a.daScore - b.daScore);

                const totalPages = Math.ceil(filtered.length / BL_PER_PAGE);
                const pageItems = filtered.slice(blPage * BL_PER_PAGE, (blPage + 1) * BL_PER_PAGE);

                // Chart data
                const dofollowCount = externalBacklinks.filter((b: any) => b.dofollow).length;
                const nofollowCount = externalBacklinks.length - dofollowCount;
                const pieData = [
                  { name: "Dofollow", value: dofollowCount, fill: "hsl(24, 100%, 55%)" },
                  { name: "Nofollow", value: nofollowCount, fill: "hsl(20, 10%, 30%)" },
                ];

                const ranges = [
                  { range: "0–10", count: externalBacklinks.filter((b: any) => b.daScore < 10).length },
                  { range: "10–30", count: externalBacklinks.filter((b: any) => b.daScore >= 10 && b.daScore < 30).length },
                  { range: "30–50", count: externalBacklinks.filter((b: any) => b.daScore >= 30 && b.daScore < 50).length },
                  { range: "50+", count: externalBacklinks.filter((b: any) => b.daScore >= 50).length },
                ];

                const anchorMap = new Map<string, number>();
                externalBacklinks.forEach((b: any) => {
                  const text = (b.anchor || "").trim();
                  if (text) anchorMap.set(text, (anchorMap.get(text) ?? 0) + 1);
                });
                const topAnchors = Array.from(anchorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, count]) => ({ text, count }));

                return (
                  <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono shrink-0">
                        {totalExternalBacklinks.toLocaleString()} backlinks · {externalBacklinks.length} domínios{filtered.length !== externalBacklinks.length ? ` · ${filtered.length} filtrados` : ""}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap ml-auto">
                        <div className="flex items-center rounded-lg border border-border overflow-hidden">
                          {(["all", "dofollow", "nofollow"] as const).map(t => (
                            <button key={t} onClick={() => { setBlFilterType(t); setBlPage(0); }}
                              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${blFilterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}>
                              {t === "all" ? "Todos" : t}
                            </button>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 uppercase tracking-wider font-semibold" onClick={() => { setBlSortDir(d => d === "desc" ? "asc" : "desc"); setBlPage(0); }}>
                          {blSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />}
                          Authority
                        </Button>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                          <Input placeholder="Buscar âncora..." className="h-7 pl-7 text-xs w-40" value={blAnchorSearch} onChange={e => { setBlAnchorSearch(e.target.value); setBlPage(0); }} />
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <Card className="overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[1000px]">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-14">DA</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Domínio</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Página de referência</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Âncora</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">Contexto</th>
                              <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono">URL de destino</th>
                              <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-14">Links</th>
                              <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-20">Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageItems.map((bl: any, i: number) => (
                              <tr key={i} className="border-b last:border-0 hover:bg-primary-light/30 transition-colors">
                                <td className="px-3 py-2.5 text-right">
                                  <span className={`font-mono text-xs font-bold ${bl.daScore >= 50 ? 'text-success' : bl.daScore >= 20 ? 'text-primary' : bl.daScore > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {bl.daScore > 0 ? bl.daScore : "—"}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <a href={`https://${bl.domainFrom}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:text-primary transition-colors">
                                    {bl.domainFrom}
                                  </a>
                                </td>
                                <td className="px-3 py-2.5 max-w-[220px]">
                                  {bl.urlFrom ? (
                                    <div>
                                      <a href={bl.urlFrom} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate block" title={bl.urlFrom}>
                                        {bl.urlFrom.replace(/^https?:\/\/[^/]+/, "") || "/"}
                                      </a>
                                      {bl.pageTitle && <p className="text-[9px] text-muted-foreground/60 truncate mt-0.5" title={bl.pageTitle}>{bl.pageTitle}</p>}
                                    </div>
                                  ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                                </td>
                                <td className="px-3 py-2.5 max-w-[160px]" title={bl.anchor || ""}>
                                  <span className="text-xs font-medium truncate block">{bl.anchor || <span className="text-muted-foreground/50 italic">—</span>}</span>
                                </td>
                                <td className="px-3 py-2.5 max-w-[200px] cursor-help" title={bl.linkContext || ""}>
                                  {bl.linkContext && bl.linkContext !== bl.anchor ? (
                                    <p className="text-[10px] text-muted-foreground/60 truncate">
                                      {bl.textPre && <span>{bl.textPre}</span>}
                                      <span className="font-semibold text-foreground">{bl.anchor}</span>
                                      {bl.textPost && <span>{bl.textPost}</span>}
                                    </p>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground/50 italic">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 max-w-[180px]">
                                  {bl.urlTo ? (
                                    <a href={bl.urlTo} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate block" title={bl.urlTo}>
                                      {bl.urlTo.replace(/^https?:\/\/[^/]+/, "") || "/"}
                                    </a>
                                  ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className="font-mono text-xs font-bold text-primary">{bl.backlinkCount}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <Badge variant={bl.dofollow ? "default" : "outline"} className={`text-[10px] px-2 ${bl.dofollow ? 'bg-success/15 text-success border-success/30 hover:bg-success/15' : 'text-muted-foreground'}`}>
                                    {bl.dofollow ? "dofollow" : "nofollow"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {blPage * BL_PER_PAGE + 1}–{Math.min((blPage + 1) * BL_PER_PAGE, filtered.length)} de {filtered.length}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={blPage === 0} onClick={() => setBlPage(p => p - 1)}>Anterior</Button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, pi) => {
                              const pageIdx = totalPages <= 5 ? pi : blPage <= 2 ? pi : blPage >= totalPages - 3 ? totalPages - 5 + pi : blPage - 2 + pi;
                              return <Button key={pageIdx} variant={blPage === pageIdx ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setBlPage(pageIdx)}>{pageIdx + 1}</Button>;
                            })}
                            <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={blPage >= totalPages - 1} onClick={() => setBlPage(p => p + 1)}>Próximo</Button>
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Dofollow vs Nofollow</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-center gap-6">
                          <ResponsiveContainer width={120} height={120}>
                            <PieChart>
                              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} strokeWidth={0}>
                                {pieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              <span className="text-xs">Dofollow</span>
                              <span className="text-xs font-mono font-bold ml-auto">{dofollowCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                              <span className="text-xs">Nofollow</span>
                              <span className="text-xs font-mono font-bold ml-auto">{nofollowCount}</span>
                            </div>
                            <div className="pt-1 border-t border-border">
                              <span className="text-[10px] text-muted-foreground font-mono">{dofollowCount > 0 ? Math.round(dofollowCount / externalBacklinks.length * 100) : 0}% dofollow</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">DA — Distribuição</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={ranges} layout="vertical">
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="range" axisLine={false} tickLine={false} width={55} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                              <RechartsTooltip contentStyle={{ background: 'hsl(20, 12%, 7%)', border: '1px solid hsl(20, 10%, 18%)', borderRadius: '8px', fontSize: '11px' }} formatter={(value) => [`${value} domínios`, ""]} />
                              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                                {ranges.map((_, idx) => <Cell key={idx} fill={idx >= 3 ? 'hsl(140, 70%, 45%)' : idx >= 2 ? 'hsl(24, 100%, 55%)' : 'hsl(20, 10%, 30%)'} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Top Âncoras</CardTitle></CardHeader>
                        <CardContent>
                          {topAnchors.length > 0 ? (
                            <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
                              {topAnchors.map((a, i) => (
                                <div key={i} className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] truncate flex-1">{a.text}</span>
                                  <span className="text-[10px] font-mono font-bold text-primary shrink-0">{a.count}x</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">Sem dados de âncoras</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })()}

              {/* Our created backlinks */}
              {siteBacklinks.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Backlinks criados pelo 8links</p>
                  {siteBacklinks.map((bl: any, i: number) => (
                    <Card key={i} className="card-interactive mb-2">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <StatusTag status={bl.status === "published" ? "completed" : bl.status === "indexed" ? "live" : "processing"} />
                          <div>
                            <p className="text-sm font-semibold">{bl.article_title ?? bl.anchor_text}</p>
                            <p className="text-xs font-mono text-muted-foreground">{bl.network_sites?.domain ?? "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {externalBacklinks.length === 0 && siteBacklinks.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <LinkIcon className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold mb-1">
                      {loadingData ? "Buscando backlinks..." : "Nenhum backlink encontrado"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {loadingData ? "Analisando domínios que linkam para seu site." : "O 8links vai criar backlinks automaticamente para seu site."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="keywords">
            <div className="mt-4">
              {allKeywords.length > 0 ? (() => {
                const kwTotalPages = Math.ceil(allKeywords.length / KW_PER_PAGE);
                const kwPageItems = allKeywords.slice(kwPage * KW_PER_PAGE, (kwPage + 1) * KW_PER_PAGE);
                return (
                  <Card className="overflow-hidden">
                    <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                        {allKeywords.length} keywords · últimos 90 dias
                      </p>
                      {gscData && <p className="text-[10px] text-success font-mono flex items-center gap-1"><Check className="w-3 h-3" /> Google Search Console</p>}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20">
                          <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider font-mono">Keyword</th>
                          <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider font-mono">Posição</th>
                          <th className="text-right text-[10px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider font-mono">Cliques</th>
                          <th className="text-right text-[10px] font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider font-mono">Impressões</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kwPageItems.map((kw: any, i: number) => {
                          const pos = kw.position ?? kw.position_current;
                          return (
                            <tr key={i} className="border-b last:border-0 hover:bg-primary-light/30 transition-colors">
                              <td className="px-4 py-3 font-medium">{kw.keyword}</td>
                              <td className="px-4 py-3">
                                {pos ? (
                                  <span className={`font-mono font-bold ${pos <= 10 ? 'text-success' : pos <= 20 ? 'text-primary' : 'text-muted-foreground'}`}>#{Math.round(pos)}</span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-primary">
                                {kw.clicks ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                                {kw.impressions?.toLocaleString() ?? kw.search_volume?.toLocaleString() ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {kwTotalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {kwPage * KW_PER_PAGE + 1}–{Math.min((kwPage + 1) * KW_PER_PAGE, allKeywords.length)} de {allKeywords.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={kwPage === 0} onClick={() => setKwPage(p => p - 1)}>Anterior</Button>
                          {Array.from({ length: Math.min(kwTotalPages, 5) }, (_, pi) => {
                            const pageIdx = kwTotalPages <= 5 ? pi : kwPage <= 2 ? pi : kwPage >= kwTotalPages - 3 ? kwTotalPages - 5 + pi : kwPage - 2 + pi;
                            return <Button key={pageIdx} variant={kwPage === pageIdx ? "default" : "outline"} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setKwPage(pageIdx)}>{pageIdx + 1}</Button>;
                          })}
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={kwPage >= kwTotalPages - 1} onClick={() => setKwPage(p => p + 1)}>Próximo</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })() : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <p>Nenhuma keyword monitorada.</p>
                  <p className="text-xs mt-1">Conecte o Google Search Console na aba Integrações.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="mt-4 space-y-4">
              {/* Summary */}
              <Card className="bg-primary-light border-primary/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{siteData.articles} artigos encontrados</p>
                      <p className="text-xs text-muted-foreground">
                        {githubArticles.length > 0 ? `Via GitHub · ${realSite?.github_repo}` : siteArticles.length > 0 ? "Artigos gerados pelo 8links" : "Nenhum artigo detectado"}
                      </p>
                    </div>
                  </div>
                  <Link href="/articles"><Button size="sm">Ver artigos</Button></Link>
                </CardContent>
              </Card>

              {/* GitHub articles list */}
              {githubArticles.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="p-3 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-2">
                      <GitBranch className="w-3.5 h-3.5" /> Conteúdo do repositório ({githubArticles.length} arquivos)
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    {githubArticles.map((article: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-primary-light/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate capitalize">{article.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">{article.path}</p>
                          </div>
                        </div>
                        <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs">
                            <ExternalLink className="w-3 h-3" /> Ver
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* DB articles list */}
              {siteArticles.length > 0 && (
                <Card className="overflow-hidden">
                  <div className="p-3 border-b border-border bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">Artigos gerados ({siteArticles.length})</p>
                  </div>
                  <div className="divide-y divide-border">
                    {siteArticles.map((article: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-primary-light/30 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{article.title ?? "Sem título"}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{article.status ?? "rascunho"}</p>
                        </div>
                        <Link href={`/articles/${article.id}/edit`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs">Editar</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* No content + no GitHub = prompt to connect */}
              {githubArticles.length === 0 && siteArticles.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold mb-1">Nenhum conteúdo detectado</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {realSite?.github_token ? "Nenhum arquivo .md ou .mdx encontrado no repositório." : "Conecte o GitHub na aba Integrações para listar seus artigos automaticamente."}
                    </p>
                    {!realSite?.github_token && (
                      <Button size="sm" variant="outline" onClick={() => setTab("integrations")}>
                        <Plug className="w-3.5 h-3.5" /> Conectar GitHub
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <div className="mt-4 space-y-4">
              {/* Google Analytics + Search Console */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📊</span>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                          Google Analytics + Search Console
                          {(realSite?.gsc_site_url || realSite?.ga_property_id) && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {realSite?.gsc_site_url ? `GSC: ${realSite.gsc_site_url}` : realSite?.google_refresh_token ? "Conectado — selecione propriedades" : "Não conectado"}
                        </p>
                      </div>
                    </div>
                    {!realSite?.google_refresh_token ? (
                      <Button size="sm" onClick={() => { window.location.href = `/api/auth/google?siteId=${id}&redirect=/sites/${id}`; }}>
                        <Plug className="w-3.5 h-3.5" /> Conectar
                      </Button>
                    ) : !(realSite?.gsc_site_url || realSite?.ga_property_id) ? (
                      <Button size="sm" variant="outline" onClick={loadGoogleProps} disabled={loadingProps}>
                        {loadingProps ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Selecionar propriedades"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={loadGoogleProps}>Alterar</Button>
                    )}
                  </div>

                  {/* Property selector */}
                  {(googleProps.length > 0 || gscSites.length > 0) && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      {gscSites.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Search Console — selecione o site</p>
                          <div className="space-y-1.5">
                            {gscSites.map((s: any) => (
                              <div key={s.siteUrl} onClick={() => setSelectedGSC(s.siteUrl)}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${selectedGSC === s.siteUrl ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGSC === s.siteUrl ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                                  {selectedGSC === s.siteUrl && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                </div>
                                <span className="text-sm font-mono">{s.siteUrl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {googleProps.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Google Analytics — selecione a propriedade</p>
                          <div className="space-y-1.5">
                            {googleProps.map((p: any) => (
                              <div key={p.id} onClick={() => setSelectedGA(p.id)}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${selectedGA === p.id ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedGA === p.id ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                                  {selectedGA === p.id && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                                </div>
                                <span className="text-sm">{p.displayName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {(selectedGA || selectedGSC) && (
                        <Button className="w-full" onClick={saveGoogleSelection}>Salvar seleção</Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WordPress */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📝</span>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                          WordPress
                          {realSite?.wp_url && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{realSite?.wp_url ?? "Publique artigos direto no blog"}</p>
                      </div>
                    </div>
                  </div>
                  {!realSite?.wp_url && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="space-y-2"><Label className="text-xs">URL do WordPress</Label><Input placeholder="https://meusite.com.br" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} /></div>
                      <div className="space-y-2"><Label className="text-xs">Usuário</Label><Input placeholder="admin" value={wpUser} onChange={(e) => setWpUser(e.target.value)} /></div>
                      <div className="space-y-2"><Label className="text-xs">Application Password</Label><Input placeholder="xxxx xxxx xxxx" type="password" value={wpPass} onChange={(e) => setWpPass(e.target.value)} /></div>
                      {wpTestResult && <div className={`p-3 rounded-lg text-sm ${wpTestResult.success ? 'bg-success-light text-success' : 'bg-[hsl(0_80%_60%/0.1)] text-destructive'}`}>{wpTestResult.success ? `✅ ${wpTestResult.message}` : `❌ ${wpTestResult.error}`}</div>}
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" disabled={wpTesting || !wpUrl || !wpUser || !wpPass} onClick={testWp}>{wpTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar"}</Button>
                        <Button className="flex-1" disabled={!wpTestResult?.success || wpSaving} onClick={saveWp}>{wpSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GitHub */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🐙</span>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                          GitHub
                          {realSite?.github_repo && <Check className="w-3.5 h-3.5 text-success" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {realSite?.github_repo ? `${realSite.github_repo}` : realSite?.github_username ? `@${realSite.github_username} — selecione o repositório` : "Para sites em Astro, Next.js, Hugo"}
                        </p>
                      </div>
                    </div>
                    {!realSite?.github_username ? (
                      <Button size="sm" onClick={() => { window.location.href = `/api/auth/github?siteId=${id}&redirect=/sites/${id}`; }}>
                        <Plug className="w-3.5 h-3.5" /> Conectar
                      </Button>
                    ) : !realSite?.github_repo ? (
                      <Button size="sm" variant="outline" onClick={loadGithubRepos} disabled={loadingRepos}>
                        {loadingRepos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Selecionar repo"}
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={loadGithubRepos} disabled={loadingRepos}>Alterar</Button>
                    )}
                  </div>

                  {/* Repo selector */}
                  {githubRepos.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Selecione o repositório do site</p>
                      <div className="max-h-60 overflow-y-auto space-y-1.5">
                        {githubRepos.map((repo: any) => (
                          <div key={repo.fullName} onClick={() => !savingRepo && saveGithubRepo(repo.fullName)}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${realSite?.github_repo === repo.fullName ? 'bg-primary-light ring-1 ring-primary/20' : 'bg-muted/30 hover:bg-muted/50'}`}>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${realSite?.github_repo === repo.fullName ? 'bg-primary border-primary' : 'border-border-strong'}`}>
                              {realSite?.github_repo === repo.fullName && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-mono truncate">{repo.fullName}</span>
                              {repo.private && <Badge variant="outline" className="ml-2 text-[10px]">privado</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
