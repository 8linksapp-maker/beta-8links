"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { humanizeError } from "@/lib/utils/error-messages";
import {
  Search, TrendingUp, Target, Sparkles, Loader2,
  Download, ArrowDown, ArrowUp, Hash, Trophy, Rocket,
  Plus, Check, ListChecks, Wand, FileText, Eye,
  ChevronDown, X, Crown, ArrowUpRight, ArrowDownRight,
  ExternalLink, LinkIcon, MousePointerClick, Zap,
  PenLine, Send, Award, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";

// ─── Types ──────────────────────────────────────────
interface GscKeyword {
  keyword: string;
  url: string;
  path: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  change: number;
  backlinks: number;
}

interface SavedKeyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  article_url?: string;
  position?: number;
  hasBacklink: boolean;
}

interface ResearchResult {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  inList: boolean;
}

function getPositionColor(pos: number) {
  if (pos <= 3) return "text-amber-400";
  if (pos <= 10) return "text-success";
  if (pos <= 20) return "text-primary";
  if (pos <= 50) return "text-warning";
  return "text-muted-foreground";
}

// ═══════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════
export default function KeywordsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "oportunidades";

  const { activeSiteId, activeSite, loading: siteLoading } = useSite();
  const [tab, setTab] = useState(initialTab);

  // ─── GSC state (Oportunidades) ────────────────────
  const [gscKeywords, setGscKeywords] = useState<GscKeyword[]>([]);
  const [gscTotals, setGscTotals] = useState<any>(null);
  const [gscLoaded, setGscLoaded] = useState(false);
  const [gscSearch, setGscSearch] = useState("");
  const [gscPage, setGscPage] = useState(0);
  const [gscSort, setGscSort] = useState<"clicks" | "position" | "change">("clicks");
  const [gscSortDir, setGscSortDir] = useState<"desc" | "asc">("desc");
  const GSC_PER_PAGE = 25;

  // ─── Plan state (Meu Plano) ───────────────────────
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [planSearch, setPlanSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "pending" | "written" | "backlinked">("all");
  const [planSort, setPlanSort] = useState<"volume" | "difficulty">("volume");
  const [planSortDir, setPlanSortDir] = useState<"desc" | "asc">("desc");
  const [planPage, setPlanPage] = useState(0);
  const PLAN_PER_PAGE = 30;

  // ─── Research state (Pesquisar) ───────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [resultSearch, setResultSearch] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [autoResults, setAutoResults] = useState<ResearchResult[]>([]);
  const [autoStep, setAutoStep] = useState(0);
  const [addingKw, setAddingKw] = useState<Set<string>>(new Set());

  // ─── Pages state (Minhas Páginas) ──────────────────
  const [sitePages, setSitePages] = useState<Array<{ url: string; title: string }>>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesSearch, setPagesSearch] = useState("");
  const [pagesPage, setPagesPage] = useState(0);
  const PAGES_PER_PAGE = 25;

  // ─── Usage ────────────────────────────────────────
  const [kwSearchUsage, setKwSearchUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [kwPlanUsage, setKwPlanUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  // ─── Backlink modal ───────────────────────────────
  const [blModalOpen, setBlModalOpen] = useState(false);
  const [blKeyword, setBlKeyword] = useState("");
  const [blUrl, setBlUrl] = useState("");
  const [blAnchor, setBlAnchor] = useState("");
  const [blCreating, setBlCreating] = useState(false);

  // ═════════════════════════════════════════════════════
  // DATA LOADING
  // ═════════════════════════════════════════════════════
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      const data = await res.json();
      if (data.usage?.keyword_search) setKwSearchUsage(data.usage.keyword_search);
      if (data.usage?.keyword_plan) setKwPlanUsage(data.usage.keyword_plan);
    } catch {}
  }, []);

  // Load GSC
  useEffect(() => {
    if (siteLoading || !activeSiteId) { if (!siteLoading) setGscLoaded(true); return; }
    setGscLoaded(false);
    setGscKeywords([]);
    setGscTotals(null);

    async function load() {
      if (activeSite?.google_refresh_token && activeSite?.gsc_site_url) {
        try {
          const res = await fetch(`/api/integrations/gsc-keywords-full?siteId=${activeSiteId}`);
          const data = await res.json();
          if (!data.error && data.keywords?.length) {
            setGscKeywords(data.keywords);
            setGscTotals(data.totals);
            setGscLoaded(true);
            return;
          }
        } catch {}
      }
      // Fallback: no GSC
      setGscLoaded(true);
    }
    load();
  }, [activeSiteId, siteLoading, activeSite]);

  // Load saved keywords (Meu Plano)
  const loadSavedKeywords = useCallback(async () => {
    if (!activeSiteId) return;
    const supabase = createClient();

    // Load keywords
    const { data } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume, difficulty, article_url, position_current")
      .eq("client_site_id", activeSiteId)
      .eq("source", "dataforseo")
      .order("search_volume", { ascending: false });

    // Load backlinks to check which keywords have one
    const { data: backlinks } = await supabase
      .from("backlinks")
      .select("anchor_text")
      .eq("client_site_id", activeSiteId);

    const backlinkAnchors = new Set((backlinks ?? []).map(b => b.anchor_text?.toLowerCase()));

    setSavedKeywords(
      (data ?? []).map(k => ({
        id: k.id,
        keyword: k.keyword,
        volume: k.search_volume ?? 0,
        difficulty: k.difficulty ?? 0,
        article_url: k.article_url ?? undefined,
        position: k.position_current ?? undefined,
        hasBacklink: backlinkAnchors.has(k.keyword.toLowerCase()),
      }))
    );
    setPlanLoaded(true);
  }, [activeSiteId]);

  useEffect(() => {
    if (!siteLoading && activeSiteId) { loadSavedKeywords(); loadUsage(); }
  }, [activeSiteId, siteLoading, loadSavedKeywords, loadUsage]);

  // Load site pages when tab = "paginas"
  const loadPages = useCallback(async () => {
    if (!activeSite?.url || pagesLoaded) return;
    setPagesLoading(true);
    try {
      const res = await fetch("/api/integrations/scrape-site", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: activeSite.url }),
      });
      const data = await res.json();
      if (data.pages?.length) setSitePages(data.pages);
    } catch {}
    setPagesLoaded(true);
    setPagesLoading(false);
  }, [activeSite?.url, pagesLoaded]);

  useEffect(() => {
    if (tab === "paginas") loadPages();
  }, [tab, loadPages]);

  // ═════════════════════════════════════════════════════
  // ACTIONS
  // ═════════════════════════════════════════════════════

  // -- Backlink creation --
  const openBacklinkModal = (keyword: string, url: string) => {
    setBlKeyword(keyword);
    setBlUrl(url);
    setBlAnchor(keyword);
    setBlModalOpen(true);
  };

  const submitBacklink = async (mode: "auto" | "manual") => {
    if (!blAnchor || !activeSiteId) return;
    if (mode === "manual") {
      setBlModalOpen(false);
      router.push(`/keywords/select-site?keyword=${encodeURIComponent(blKeyword)}&url=${encodeURIComponent(blUrl)}&anchor=${encodeURIComponent(blAnchor)}`);
      return;
    }

    setBlCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBlCreating(false); return; }

    const { data: inserted, error } = await supabase.from("backlinks").insert({
      user_id: user.id,
      client_site_id: activeSiteId,
      target_url: blUrl,
      anchor_text: blAnchor,
      anchor_type: "partial",
      status: "queued",
    }).select().single();

    if (error) { setBlCreating(false); toast.error(`Erro: ${error.message}`); return; }
    setBlModalOpen(false);
    toast("Backlink criado — gerando artigo...", { duration: 5000 });

    try {
      const res = await fetch("/api/admin/process-backlink", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backlinkId: inserted.id }),
      });
      const result = await res.json();
      if (result.success) toast.success("Backlink publicado!", { duration: 6000 });
      else {
        toast.error(result.error || humanizeError(result.detail).user, { duration: 5000 });
        console.error("[backlink] erro:", result.detail ?? result);
      }
    } catch (e) {
      toast.error(humanizeError(e).user);
      console.error("[backlink] erro de rede:", e);
    }
    setBlCreating(false);
  };

  // -- Manual search --
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchDone(false);
    setResults([]);
    try {
      const res = await fetch("/api/keyword-research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchQuery.trim(), siteId: activeSiteId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        if (data.usage) setKwSearchUsage({ used: data.usage.used, limit: data.usage.limit, remaining: data.usage.remaining ?? 0 });
      } else {
        const savedSet = new Set(savedKeywords.map(k => k.keyword.toLowerCase()));
        setResults((data.keywords ?? []).map((k: ResearchResult) => ({
          ...k, inList: k.inList || savedSet.has(k.keyword.toLowerCase()),
        })));
        loadUsage();
      }
    } catch { toast.error("Erro ao pesquisar"); }
    setSearching(false);
    setSearchDone(true);
  };

  // -- Auto discovery --
  const startAutoMode = async () => {
    if (!activeSite) return;
    setAutoMode(true); setAutoStep(1); setAutoResults([]);
    try {
      const domain = activeSite.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
      setAutoStep(2);
      const res = await fetch("/api/admin/plan-content", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, niche: activeSite.niche_primary, context: (activeSite as any)?.site_context?.gptSummary ?? activeSite.niche_primary, targetKeywords: 200 }),
      });
      setAutoStep(3);
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        if (data.usage) setKwPlanUsage({ used: data.usage.used, limit: data.usage.limit, remaining: data.usage.remaining ?? 0 });
      } else if (data.keywords?.length) {
        const savedSet = new Set(savedKeywords.map(k => k.keyword.toLowerCase()));
        setAutoResults(data.keywords.map((k: any) => ({ keyword: k.keyword, volume: k.volume, difficulty: k.difficulty, cpc: 0, inList: savedSet.has(k.keyword.toLowerCase()) })));
        toast.success(`${data.keywords.length} oportunidades encontradas!`);
        loadUsage();
      } else { toast.error("Nenhuma keyword encontrada"); }
    } catch { toast.error("Erro no modo automático"); }
    setAutoStep(0); setAutoMode(false);
  };

  // -- Add to plan --
  const addToList = async (kw: ResearchResult) => {
    if (!activeSiteId) return;
    setAddingKw(prev => new Set(prev).add(kw.keyword));
    const supabase = createClient();
    const { error } = await supabase.from("keywords").insert({
      client_site_id: activeSiteId, keyword: kw.keyword, search_volume: kw.volume,
      difficulty: kw.difficulty, cpc: kw.cpc ?? 0, source: "dataforseo", content_status: "pendente",
    });
    if (error) {
      console.error("[keywords] add failed:", error);
      toast.error("Não conseguimos adicionar essa palavra-chave. Tente novamente.");
    }
    else {
      setResults(prev => prev.map(r => r.keyword === kw.keyword ? { ...r, inList: true } : r));
      setAutoResults(prev => prev.map(r => r.keyword === kw.keyword ? { ...r, inList: true } : r));
      await loadSavedKeywords();
    }
    setAddingKw(prev => { const s = new Set(prev); s.delete(kw.keyword); return s; });
  };

  const addAllToList = async (keywords: ResearchResult[]) => {
    if (!activeSiteId) return;
    const toAdd = keywords.filter(k => !k.inList);
    if (toAdd.length === 0) { toast("Todas já estão na lista"); return; }
    const supabase = createClient();
    const rows = toAdd.map(k => ({ client_site_id: activeSiteId, keyword: k.keyword, search_volume: k.volume, difficulty: k.difficulty, cpc: k.cpc ?? 0, source: "dataforseo" as const, content_status: "pendente" }));
    for (let i = 0; i < rows.length; i += 50) { await supabase.from("keywords").insert(rows.slice(i, i + 50)); }
    setResults(prev => prev.map(r => ({ ...r, inList: true })));
    setAutoResults(prev => prev.map(r => ({ ...r, inList: true })));
    await loadSavedKeywords();
    toast.success(`${toAdd.length} keywords adicionadas!`);
  };

  // -- Remove from plan --
  const removeFromList = async (kwId: string) => {
    const supabase = createClient();
    await supabase.from("keywords").delete().eq("id", kwId);
    const removed = savedKeywords.find(k => k.id === kwId);
    setSavedKeywords(prev => prev.filter(k => k.id !== kwId));
    if (removed) {
      setResults(prev => prev.map(r => r.keyword === removed.keyword ? { ...r, inList: false } : r));
      setAutoResults(prev => prev.map(r => r.keyword === removed.keyword ? { ...r, inList: false } : r));
    }
  };

  // -- Download --
  const downloadPlan = () => {
    const domain = activeSite?.url?.replace(/^https?:\/\//, "") ?? "site";
    const getStatus = (k: SavedKeyword) => k.hasBacklink ? "Backlink enviado" : k.article_url ? "Artigo escrito" : "Pendente";
    const csv = "Keyword,Volume,Dificuldade,Status,URL Artigo\n" + savedKeywords.map(k => `"${k.keyword}",${k.volume},${k.difficulty},${getStatus(k)},"${k.article_url ?? ""}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `keywords_${domain.replace(/\./g, "_")}.csv`; a.click();
  };

  // ═════════════════════════════════════════════════════
  // COMPUTED
  // ═════════════════════════════════════════════════════

  // GSC filtered/sorted
  const gscFiltered = gscKeywords
    .filter(k => !gscSearch || k.keyword.toLowerCase().includes(gscSearch.toLowerCase()))
    .sort((a, b) => {
      const m = gscSortDir === "desc" ? -1 : 1;
      if (gscSort === "clicks") return (a.clicks - b.clicks) * m;
      if (gscSort === "position") return (a.position - b.position) * m;
      return (a.change - b.change) * m;
    });
  const gscTotalPages = Math.ceil(gscFiltered.length / GSC_PER_PAGE);
  const gscPageItems = gscFiltered.slice(gscPage * GSC_PER_PAGE, (gscPage + 1) * GSC_PER_PAGE);

  // Plan filtered/sorted
  const planFiltered = savedKeywords
    .filter(k => {
      if (planFilter === "pending") return !k.article_url;
      if (planFilter === "written") return !!k.article_url && !k.hasBacklink;
      if (planFilter === "backlinked") return k.hasBacklink;
      return true;
    })
    .filter(k => !planSearch || k.keyword.toLowerCase().includes(planSearch.toLowerCase()))
    .sort((a, b) => { const m = planSortDir === "desc" ? -1 : 1; return planSort === "volume" ? (a.volume - b.volume) * m : (a.difficulty - b.difficulty) * m; });
  const planTotalPages = Math.ceil(planFiltered.length / PLAN_PER_PAGE);
  const planPageItems = planFiltered.slice(planPage * PLAN_PER_PAGE, (planPage + 1) * PLAN_PER_PAGE);

  const pendingCount = savedKeywords.filter(k => !k.article_url).length;
  const writtenCount = savedKeywords.filter(k => !!k.article_url && !k.hasBacklink).length;
  const backlinkedCount = savedKeywords.filter(k => k.hasBacklink).length;

  // Research results
  const displayResults = autoResults.length > 0 ? autoResults : results;
  const filteredResults = displayResults.filter(r => !resultSearch || r.keyword.toLowerCase().includes(resultSearch.toLowerCase()));

  // Stats
  const totalKw = gscTotals?.totalKeywords ?? gscKeywords.length;
  const top10 = gscTotals?.inTop10 ?? gscKeywords.filter(k => k.position <= 10).length;
  const totalClicks = gscTotals?.totalClicks ?? 0;
  const avgPos = gscTotals?.avgPosition ?? 0;

  const toggleGscSort = (col: typeof gscSort) => { if (gscSort === col) setGscSortDir(d => d === "desc" ? "asc" : "desc"); else { setGscSort(col); setGscSortDir("desc"); } setGscPage(0); };
  const togglePlanSort = (col: typeof planSort) => { if (planSort === col) setPlanSortDir(d => d === "desc" ? "asc" : "desc"); else { setPlanSort(col); setPlanSortDir("desc"); } setPlanPage(0); };

  // Smart action for GSC keyword
  function getSmartAction(kw: GscKeyword) {
    if (kw.position <= 3) return { label: "Top 3", icon: Crown, variant: "success" as const, action: null };
    if (kw.position <= 10) return { label: "Enviar Backlink", icon: Send, variant: "primary" as const, action: () => openBacklinkModal(kw.keyword, kw.url) };
    if (kw.position <= 30) return { label: "Enviar Backlink", icon: Send, variant: "primary" as const, action: () => openBacklinkModal(kw.keyword, kw.url) };
    return { label: "Escrever Artigo", icon: PenLine, variant: "outline" as const, action: () => router.push(`/articles/write?keyword=${encodeURIComponent(kw.keyword)}`) };
  }

  // ═════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Keywords</h1>
          <p className="text-sm text-muted-foreground mt-1">Descubra, planeje e acompanhe suas palavras-chave</p>
        </div>
        {savedKeywords.length > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={downloadPlan}>
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
        )}
      </motion.div>

      {/* KPIs */}
      {gscLoaded && gscKeywords.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Keywords rankeando" value={totalKw} icon={Hash} />
          <MetricCard label="No Top 10" value={top10} icon={Trophy} />
          <MetricCard label="Cliques (30d)" value={totalClicks} icon={MousePointerClick} />
          <MetricCard label="No plano" value={savedKeywords.length} icon={ListChecks} />
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="oportunidades" className="gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Oportunidades
            {gscKeywords.length > 0 && <span className="ml-1 text-[10px] font-bold bg-success/15 text-success px-1.5 py-0.5 rounded-full">{gscKeywords.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="plano" className="gap-2">
            <ListChecks className="w-3.5 h-3.5" /> Meu Plano
            {savedKeywords.length > 0 && <span className="ml-1 text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">{savedKeywords.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="paginas" className="gap-2">
            <Globe className="w-3.5 h-3.5" /> Minhas Páginas
            {sitePages.length > 0 && <span className="ml-1 text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full">{sitePages.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="pesquisar" className="gap-2">
            <Search className="w-3.5 h-3.5" /> Pesquisar
          </TabsTrigger>
        </TabsList>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: OPORTUNIDADES (GSC)                      */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="oportunidades">
          {!gscLoaded ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : gscKeywords.length === 0 ? (
            <EmptyState icon={Search} title="Conecte o Google Search Console"
              description="Veja quais palavras-chave já trazem visitantes ao seu site e descubra oportunidades de crescimento"
              action={{ label: "Ir para Pesquisar", onClick: () => setTab("pesquisar") }} />
          ) : (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar keyword..." value={gscSearch} onChange={e => { setGscSearch(e.target.value); setGscPage(0); }} className="pl-9" />
              </div>

              {/* GSC table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Keyword</th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-20">
                          <button onClick={() => toggleGscSort("position")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                            Posição {gscSort === "position" && (gscSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                          </button>
                        </th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-20">
                          <button onClick={() => toggleGscSort("change")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                            Variação {gscSort === "change" && (gscSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                          </button>
                        </th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-20">
                          <button onClick={() => toggleGscSort("clicks")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground ml-auto">
                            Cliques {gscSort === "clicks" && (gscSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                          </button>
                        </th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-36">Próximo passo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gscPageItems.map((kw, i) => {
                        const smart = getSmartAction(kw);
                        return (
                          <tr key={i} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${kw.position <= 3 ? 'bg-amber-400/[0.03]' : ''}`}>
                            <td className="px-4 py-2.5 max-w-[300px]">
                              <div className="flex items-center gap-2">
                                {kw.position <= 3 && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                <div className="min-w-0">
                                  <span className="font-medium text-[13px] truncate block">{kw.keyword}</span>
                                  {kw.url && (
                                    <a href={kw.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate block">
                                      {kw.path || "/"} <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 opacity-40" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`font-mono font-bold ${getPositionColor(kw.position)}`}>
                                #{Math.round(kw.position)}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {kw.change !== 0 ? (
                                <span className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono ${kw.change > 0 ? 'text-success' : 'text-destructive'}`}>
                                  {kw.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {kw.change > 0 ? "+" : ""}{Math.round(kw.change)}
                                </span>
                              ) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-primary">
                              {kw.clicks > 0 ? kw.clicks : "—"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {smart.action ? (
                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 px-2.5" onClick={smart.action}>
                                  <smart.icon className="w-3 h-3" /> {smart.label}
                                </Button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                  <Crown className="w-3 h-3" /> {smart.label}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {gscTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground font-mono">{gscPage * GSC_PER_PAGE + 1}–{Math.min((gscPage + 1) * GSC_PER_PAGE, gscFiltered.length)} de {gscFiltered.length}</p>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={gscPage === 0} onClick={() => setGscPage(p => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={gscPage >= gscTotalPages - 1} onClick={() => setGscPage(p => p + 1)}>Próximo</Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider font-mono text-[10px]">Posição:</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Top 3</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" />Top 10</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Top 20</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" />Top 50</span>
                {gscTotals && (
                  <>
                    <span className="text-success ml-2">↑ {gscTotals.totalUp} subiram</span>
                    <span className="text-destructive">↓ {gscTotals.totalDown} desceram</span>
                  </>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: MEU PLANO (pipeline)                     */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="plano">
          {!planLoaded ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : savedKeywords.length === 0 ? (
            <EmptyState icon={ListChecks} title="Seu plano está vazio"
              description="Pesquise keywords e adicione as melhores ao seu plano de conteúdo"
              action={{ label: "Pesquisar keywords", onClick: () => setTab("pesquisar") }} />
          ) : (
            <div className="space-y-4">
              {/* Pipeline filter — derived states */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 overflow-x-auto">
                {([
                  { key: "all" as const, label: "Todas", count: savedKeywords.length, dot: "" },
                  { key: "pending" as const, label: "Precisa artigo", count: pendingCount, dot: "bg-muted-foreground" },
                  { key: "written" as const, label: "Precisa backlink", count: writtenCount, dot: "bg-primary" },
                  { key: "backlinked" as const, label: "Backlink enviado", count: backlinkedCount, dot: "bg-success" },
                ]).map(f => (
                  <button key={f.key} onClick={() => { setPlanFilter(f.key); setPlanPage(0); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${planFilter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                    {f.label}
                    <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded-full font-mono">{f.count}</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={planSearch} onChange={e => { setPlanSearch(e.target.value); setPlanPage(0); }} placeholder="Buscar no plano..." className="pl-9" />
              </div>

              {/* Plan table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Keyword</th>
                        <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-24">
                          <button onClick={() => togglePlanSort("volume")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground ml-auto">
                            Volume {planSort === "volume" && (planSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                          </button>
                        </th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-24">
                          <button onClick={() => togglePlanSort("difficulty")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground">
                            Dificuldade {planSort === "difficulty" && (planSortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                          </button>
                        </th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-40">Próximo passo</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {planPageItems.map(kw => {
                        // Derive state from data
                        const hasArticle = !!kw.article_url;
                        const hasBacklink = kw.hasBacklink;
                        const isRanking = kw.position && kw.position < 999;

                        return (
                          <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-[13px]">{kw.keyword}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {hasArticle && (
                                  <a href={kw.article_url} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer">
                                    <FileText className="w-2.5 h-2.5" /> Artigo
                                  </a>
                                )}
                                {hasBacklink && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-success">
                                    <LinkIcon className="w-2.5 h-2.5" /> Backlink
                                  </span>
                                )}
                                {isRanking && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400">
                                    <Crown className="w-2.5 h-2.5" /> #{kw.position}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-primary">{kw.volume.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center"><DifficultyBadge difficulty={kw.difficulty} /></td>
                            <td className="px-3 py-2.5 text-center">
                              {!hasArticle ? (
                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 px-2.5"
                                  onClick={() => router.push(`/articles/write?keyword=${encodeURIComponent(kw.keyword)}&keywordId=${kw.id}`)}>
                                  <PenLine className="w-3 h-3" /> Escrever Artigo
                                </Button>
                              ) : !hasBacklink ? (
                                <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 px-2.5"
                                  onClick={() => openBacklinkModal(kw.keyword, kw.article_url ?? activeSite?.url ?? "")}>
                                  <Send className="w-3 h-3" /> Enviar Backlink
                                </Button>
                              ) : isRanking ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                  <Award className="w-3 h-3" /> Rankeando
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                                  <Check className="w-3 h-3" /> Concluído
                                </span>
                              )}
                            </td>
                            <td className="px-1 py-2.5">
                              <button onClick={() => removeFromList(kw.id)} className="text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer p-1" title="Remover">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {planTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground font-mono">{planPage * PLAN_PER_PAGE + 1}–{Math.min((planPage + 1) * PLAN_PER_PAGE, planFiltered.length)} de {planFiltered.length}</p>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={planPage === 0} onClick={() => setPlanPage(p => p - 1)}>Anterior</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={planPage >= planTotalPages - 1} onClick={() => setPlanPage(p => p + 1)}>Próximo</Button>
                    </div>
                  </div>
                )}
              </Card>

              {/* Progress bar */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider font-mono text-[10px]">Progresso:</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden flex">
                  {backlinkedCount > 0 && <div className="h-full bg-success" style={{ width: `${(backlinkedCount / savedKeywords.length) * 100}%` }} />}
                  {writtenCount > 0 && <div className="h-full bg-primary" style={{ width: `${(writtenCount / savedKeywords.length) * 100}%` }} />}
                  {pendingCount > 0 && <div className="h-full bg-muted-foreground/30" style={{ width: `${(pendingCount / savedKeywords.length) * 100}%` }} />}
                </div>
                <span className="font-mono text-[10px]">{backlinkedCount}/{savedKeywords.length} completas</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: MINHAS PÁGINAS                           */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="paginas">
          {pagesLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : sitePages.length === 0 ? (
            <EmptyState icon={Globe} title="Nenhuma página encontrada"
              description="Não encontramos o sitemap do seu site. Verifique se ele está acessível."
              action={{ label: "Tentar novamente", onClick: () => { setPagesLoaded(false); loadPages(); } }} />
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar página..." value={pagesSearch} onChange={e => { setPagesSearch(e.target.value); setPagesPage(0); }} className="pl-9" />
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Página</th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-36">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = sitePages.filter(p =>
                          !pagesSearch ||
                          p.title.toLowerCase().includes(pagesSearch.toLowerCase()) ||
                          p.url.toLowerCase().includes(pagesSearch.toLowerCase())
                        );
                        const totalPagesCount = Math.ceil(filtered.length / PAGES_PER_PAGE);
                        const pageItems = filtered.slice(pagesPage * PAGES_PER_PAGE, (pagesPage + 1) * PAGES_PER_PAGE);
                        return (
                          <>
                            {pageItems.map((page, i) => {
                              const fullUrl = page.url.startsWith("http") ? page.url : `${activeSite?.url}${page.url}`;
                              return (
                                <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                  <td className="px-4 py-2.5">
                                    <div>
                                      <p className="font-medium text-[13px] truncate max-w-[500px]">{page.title}</p>
                                      <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-[10px] font-mono text-muted-foreground hover:text-primary truncate block max-w-[500px]">
                                        {page.url} <ExternalLink className="w-2 h-2 inline ml-0.5" />
                                      </a>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1.5 px-2.5"
                                      onClick={() => openBacklinkModal(page.title, fullUrl)}>
                                      <Send className="w-3 h-3" /> Enviar Backlink
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                            {totalPagesCount > 1 && (
                              <tr>
                                <td colSpan={2}>
                                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {pagesPage * PAGES_PER_PAGE + 1}–{Math.min((pagesPage + 1) * PAGES_PER_PAGE, filtered.length)} de {filtered.length}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={pagesPage === 0} onClick={() => setPagesPage(p => p - 1)}>Anterior</Button>
                                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={pagesPage >= totalPagesCount - 1} onClick={() => setPagesPage(p => p + 1)}>Próximo</Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* TAB: PESQUISAR                                */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TabsContent value="pesquisar">
          <div className="space-y-5">
            {/* Search bar */}
            <Card className="overflow-hidden">
              <CardContent className="p-5">
                <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                      <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Digite uma keyword... ex: como montar loja virtual" className="pl-10 h-11 text-base" disabled={searching} />
                    </div>
                    <Button type="submit" disabled={searching || !searchQuery.trim() || (kwSearchUsage !== null && kwSearchUsage.remaining <= 0)} className="h-11 px-6 gap-2">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Pesquisar
                    </Button>
                  </div>

                  {kwSearchUsage && (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-[11px] ${kwSearchUsage.remaining <= 0 ? "bg-destructive/10 border border-destructive/20" : "bg-muted/30"}`}>
                      <span className="flex items-center gap-1.5"><Search className="w-3 h-3 text-primary shrink-0" /><span className="text-muted-foreground">Pesquisas hoje</span></span>
                      <span className="font-mono font-bold">
                        {kwSearchUsage.remaining <= 0 ? <span className="text-destructive">Limite diário atingido</span> : <><span className={kwSearchUsage.remaining <= 2 ? "text-warning" : "text-foreground"}>{kwSearchUsage.remaining}</span><span className="text-muted-foreground">/{kwSearchUsage.limit}</span></>}
                      </span>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold">Resultados para "{searchQuery}"</h3>
                    <Badge variant="outline" className="text-[10px]">{results.length} keywords</Badge>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => addAllToList(filteredResults)}>
                    <Plus className="w-3 h-3" /> Adicionar todas ao plano
                  </Button>
                </div>

                {results.length > 10 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={resultSearch} onChange={e => setResultSearch(e.target.value)} placeholder="Filtrar resultados..." className="pl-9 h-8 text-xs" />
                  </div>
                )}

                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left text-[10px] font-semibold text-muted-foreground px-4 py-2.5 uppercase tracking-wider font-mono">Keyword</th>
                          <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-24">Buscas/mês</th>
                          <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-24">Dificuldade</th>
                          <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-28">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.slice(0, 50).map((kw, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-[13px]">{kw.keyword}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-primary">{kw.volume.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-center"><DifficultyBadge difficulty={kw.difficulty} /></td>
                            <td className="px-3 py-2.5 text-center">
                              {kw.inList ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success"><Check className="w-3.5 h-3.5" /> No plano</span>
                              ) : (
                                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" disabled={addingKw.has(kw.keyword)} onClick={() => addToList(kw)}>
                                  {addingKw.has(kw.keyword) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  Adicionar ao plano
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredResults.length > 50 && (
                    <div className="px-4 py-2 border-t bg-muted/20 text-center">
                      <p className="text-[10px] text-muted-foreground">Mostrando 50 de {filteredResults.length}. Use o filtro para refinar.</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {searchDone && results.length === 0 && (
              <Card className="border-dashed"><CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhum resultado para "{searchQuery}"</p>
                <p className="text-xs text-muted-foreground mt-1">Tente uma palavra mais genérica</p>
              </CardContent></Card>
            )}

            {!searchDone && results.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: "🔍", title: "Pesquise palavras-chave", desc: "Digite qualquer palavra e veja volume de buscas real e dificuldade de ranqueamento" },
                  { icon: "📋", title: "Adicione ao seu plano", desc: "Selecione as melhores keywords e acompanhe o progresso de cada uma" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="h-full"><CardContent className="p-5">
                      <span className="text-2xl">{item.icon}</span>
                      <h3 className="text-sm font-bold mt-3 mb-1">{item.title}</h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent></Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* BACKLINK MODAL                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Dialog open={blModalOpen} onOpenChange={setBlModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base leading-tight">Enviar backlink</DialogTitle>
          </DialogHeader>

          {blUrl && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">URL de destino</p>
              <p className="text-xs font-mono break-all">{blUrl}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Texto âncora</Label>
            <Input value={blAnchor} onChange={e => setBlAnchor(e.target.value)} placeholder="ex: consultoria de SEO" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Automático — em breve */}
            <div className="p-4 rounded-xl border border-border bg-card opacity-40 cursor-default relative">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-bold mb-1">Automático</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Escolhe o site, gera artigo e publica.</p>
              <span className="absolute top-3 right-3 text-[8px] font-bold uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">breve</span>
            </div>

            {/* Manual */}
            <button onClick={() => submitBacklink("manual")} disabled={!blAnchor || blCreating}
              className="p-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-left cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center mb-2">
                <Search className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-bold mb-1">Escolher site</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">Escolha o site parceiro e revise antes de publicar.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Components ─────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const label = difficulty <= 20 ? "Fácil" : difficulty <= 40 ? "Médio" : "Difícil";
  const colors = difficulty <= 20 ? "text-success bg-success/10" : difficulty <= 40 ? "text-primary bg-primary/10" : "text-warning bg-warning/10";
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${colors}`}>{label} · {difficulty}</span>;
}
