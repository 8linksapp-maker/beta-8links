"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Plus, Search, Loader2, Check, X,
  FileText, Link as LinkIcon, Sparkles,
  Trash2, MapPin, Pencil, LayoutGrid, List,
  Trophy, BookmarkCheck, Plug,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageMetrics, countSince } from "@/components/ui/page-metrics";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
const CreateBacklinkDialog = dynamic(
  () => import("@/components/backlinks/create-backlink-dialog").then(m => ({ default: m.CreateBacklinkDialog })),
  { ssr: false }
);
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";

type SavedKeyword = {
  id: string;
  keyword: string;
  search_volume: number;
  difficulty: number;
  position_current: number | null;
  source: string;
  target_url: string | null;
  created_at: string;
};

type SearchedKeyword = {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  inList: boolean;
};

type Tab = "plano" | "buscar";
type ViewMode = "cards" | "list";

const SEARCH_LIMIT_DAILY = 10;

export default function PalavrasPage() {
  const router = useRouter();
  const { activeSite, loading: siteLoading } = useSite();
  const [tab, setTab] = useState<Tab>("plano");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Plano
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [manualInput, setManualInput] = useState("");
  const [manualAdding, setManualAdding] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);

  // Buscar
  const [searchTerm, setSearchTerm] = useState("");
  const [searchSeed, setSearchSeed] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedKeyword[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [searchUsage, setSearchUsage] = useState<{ used: number; limit: number } | null>(null);
  const [bulkAdding, setBulkAdding] = useState(false);

  // Load saved keywords
  const loadSaved = useCallback(async () => {
    if (!activeSite) return;
    setPlanLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume, difficulty, position_current, source, target_url, created_at")
      .eq("client_site_id", activeSite.id)
      .order("created_at", { ascending: false });
    if (error) console.error("[palavras] failed to load saved keywords:", error);
    setSavedKeywords((data ?? []) as any);
    setPlanLoading(false);
  }, [activeSite]);

  // Load usage counter
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const data = await res.json();
      const ks = data?.usage?.keyword_search;
      if (ks) setSearchUsage({ used: ks.used, limit: ks.limit });
    } catch {}
  }, []);

  useEffect(() => {
    loadSaved();
    loadUsage();
  }, [loadSaved, loadUsage]);

  const addManual = async () => {
    if (!activeSite) { toast.error("Você precisa de um site cadastrado primeiro"); return; }
    const word = manualInput.trim();
    if (!word) return;
    if (savedKeywords.some(k => k.keyword.toLowerCase() === word.toLowerCase())) {
      toast.error("Essa palavra já está no seu plano");
      return;
    }
    setManualAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("keywords")
      .insert({
        client_site_id: activeSite.id,
        keyword: word,
        search_volume: 0,
        difficulty: 0,
        source: "dataforseo", // valid value per schema
      })
      .select().single();
    if (error || !data) {
      console.error("[palavras] failed to add manual keyword:", error);
      toast.error("Não conseguimos adicionar. Tente novamente.");
    } else {
      setSavedKeywords(prev => [data, ...prev]);
      setManualInput("");
      toast.success("Palavra adicionada ao plano");
    }
    setManualAdding(false);
  };

  // Show only "domain.com/" — protocol stripped, no trailing path
  const domainPrefix = (() => {
    const base = (activeSite?.url ?? "").replace(/\/+$/, "");
    return base.replace(/^https?:\/\//i, "");
  })();

  // Strip the site domain from a saved target_url, leaving only the path slug
  const pathFromTarget = (url: string | null): string => {
    if (!url) return "";
    const base = (activeSite?.url ?? "").replace(/\/+$/, "");
    if (base && url.startsWith(base)) {
      return url.slice(base.length).replace(/^\/+/, "");
    }
    return url.replace(/^https?:\/\/[^/]+\/?/i, "");
  };

  const startEditTarget = (kw: SavedKeyword) => {
    setEditingTargetId(kw.id);
    setEditingTargetValue(pathFromTarget(kw.target_url));
  };

  const cancelEditTarget = () => {
    setEditingTargetId(null);
    setEditingTargetValue("");
  };

  const saveTarget = async (id: string) => {
    setSavingTarget(true);
    // Path is always relative to the active site domain
    const path = editingTargetValue.trim().replace(/^\/+/, "");
    const base = (activeSite?.url ?? "").replace(/\/+$/, "");
    const finalValue: string | null = base ? (path ? `${base}/${path}` : base) : null;

    // Cada página só pode ter 1 palavra apontada pra ela.
    // Conferir antes de salvar pra dar mensagem amigável (banco também tem unique index como rede de proteção).
    if (finalValue) {
      const conflict = savedKeywords.find(k => k.id !== id && k.target_url === finalValue);
      if (conflict) {
        toast.error(`Essa página já está direcionada para a palavra "${conflict.keyword}". Cada página só pode ter uma palavra apontando pra ela.`);
        setSavingTarget(false);
        return;
      }
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("keywords")
      .update({ target_url: finalValue })
      .eq("id", id);
    if (error) {
      console.error("[palavras] failed to save target_url:", error);
      // Postgres unique violation = race condition (alguém em outra aba salvou primeiro)
      if (error.code === "23505") {
        toast.error("Essa página já está direcionada para outra palavra. Atualize a lista.");
        await loadSaved();
      } else {
        toast.error("Não conseguimos salvar. Tente de novo.");
      }
    } else {
      setSavedKeywords(prev => prev.map(k => k.id === id ? { ...k, target_url: finalValue } : k));
      cancelEditTarget();
      toast.success(finalValue ? "Página alvo definida" : "Página alvo removida");
    }
    setSavingTarget(false);
  };

  const removeKeyword = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("keywords").delete().eq("id", id);
    if (error) {
      toast.error("Não conseguimos remover. Tente novamente.");
      return;
    }
    setSavedKeywords(prev => prev.filter(k => k.id !== id));
    toast.success("Removida do plano");
  };

  const doSearch = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    if (!activeSite) { toast.error("Você precisa de um site cadastrado"); return; }
    setSearching(true);
    setSearchResults([]);
    setSelectedToAdd(new Set());
    try {
      const res = await fetch("/api/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term, siteId: activeSite.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não conseguimos pesquisar agora");
        setSearching(false);
        return;
      }
      setSearchSeed(data.seed);
      setSearchResults(data.keywords ?? []);
      // Refresh usage counter
      loadUsage();
      if ((data.keywords ?? []).length === 0) {
        toast.message("Nenhuma palavra parecida encontrada");
      }
    } catch (e) {
      console.error("[palavras] search failed:", e);
      toast.error("Não conseguimos pesquisar agora. Tente em alguns instantes.");
    }
    setSearching(false);
  };

  const toggleSelected = (kw: string) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  };

  const addSelected = async () => {
    if (!activeSite || selectedToAdd.size === 0) return;
    setBulkAdding(true);
    const supabase = createClient();
    const toInsert = searchResults
      .filter(r => selectedToAdd.has(r.keyword))
      .map(r => ({
        client_site_id: activeSite.id,
        keyword: r.keyword,
        search_volume: r.volume ?? 0,
        difficulty: r.difficulty ?? 0,
        cpc: r.cpc ?? 0,
        source: "dataforseo" as const,
      }));
    const { data, error } = await supabase.from("keywords").insert(toInsert).select();
    if (error) {
      console.error("[palavras] bulk add failed:", error);
      toast.error("Não conseguimos adicionar. Tente novamente.");
    } else {
      const added = data?.length ?? 0;
      toast.success(`${added} palavra${added === 1 ? "" : "s"} adicionada${added === 1 ? "" : "s"} ao plano`);
      // Mark searched as inList
      setSearchResults(prev => prev.map(r => selectedToAdd.has(r.keyword) ? { ...r, inList: true } : r));
      setSelectedToAdd(new Set());
      // Reload saved list
      loadSaved();
    }
    setBulkAdding(false);
  };

  const [createBacklinkKwId, setCreateBacklinkKwId] = useState<string | null>(null);

  const createIndicacao = (kw: SavedKeyword) => {
    if (!activeSite) return;
    setCreateBacklinkKwId(kw.id);
  };

  const escreverArtigo = (keyword: string) => {
    router.push(`/articles/write?keyword=${encodeURIComponent(keyword)}`);
  };

  if (siteLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!activeSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-muted-foreground mb-4">Você precisa cadastrar um site primeiro.</p>
        <Link href="/sites/new"><Button>Cadastrar site</Button></Link>
      </div>
    );
  }

  // Compute KPI values from saved keywords
  const totalKeywords = savedKeywords.length;
  const withTarget = savedKeywords.filter(k => !!k.target_url).length;
  const positioned = savedKeywords.filter(k => k.position_current !== null && k.position_current > 0 && k.position_current <= 100).length;
  const newThisWeek = countSince(savedKeywords, 7);
  const hasGoogle = !!(activeSite as any)?.google_refresh_token;
  const connectGoogle = () => {
    if (!activeSite) return;
    window.location.href = `/api/auth/google?siteId=${activeSite.id}&redirect=/palavras`;
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-display)] tracking-tight">Suas palavras</h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          As palavras que você quer aparecer no Google. Pra cada uma, você cria backlinks ou escreve artigos.
        </p>
      </div>

      {/* KPIs */}
      <PageMetrics
        loading={planLoading}
        items={[
          {
            label: "Palavras no plano",
            value: totalKeywords,
            icon: Search,
            accent: true,
            trend: totalKeywords > 0 ? { delta: newThisWeek, label: "esta semana" } : undefined,
          },
          {
            label: "Com página definida",
            value: withTarget,
            icon: BookmarkCheck,
            hint: totalKeywords > 0 && withTarget < totalKeywords
              ? `${totalKeywords - withTarget} ainda sem página alvo`
              : undefined,
          },
          {
            label: "Já no Google",
            value: positioned,
            icon: Trophy,
            hint: hasGoogle
              ? (positioned > 0 ? "rankeando entre top 100" : "nada na top 100 ainda")
              : "Conecte o Google pra ver suas posições reais",
            action: hasGoogle ? undefined : { label: "Conectar Google", onClick: connectGoogle, icon: Plug },
          },
        ]}
      />

      {/* Tabs */}
      <FilterPills
        options={[
          { id: "plano", label: "Meu plano", count: savedKeywords.length > 0 ? savedKeywords.length : undefined },
          { id: "buscar", label: "Keyword Planner" },
        ]}
        value={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {/* TAB: PLANO */}
      <AnimatePresence mode="wait">
        {tab === "plano" && (
          <motion.div
            key="plano"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Quick add manually */}
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Adicionar uma palavra ao plano (ex: cosmético natural)"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && manualInput.trim() && !manualAdding && addManual()}
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                  <Button
                    onClick={addManual}
                    disabled={!manualInput.trim() || manualAdding}
                    size="lg"
                    className="h-12 gap-2"
                  >
                    {manualAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setTab("buscar")}
                    className="h-12 gap-2"
                  >
                    <Search className="w-4 h-4" /> Keyword Planner
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* List */}
            {planLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : savedKeywords.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Seu plano está vazio"
                description="Adicione palavras que você quer ver aparecer no Google. Pra cada palavra você pode criar backlinks ou escrever artigos."
                action={{ label: "Abrir Keyword Planner", onClick: () => setTab("buscar") }}
              />
            ) : (
              <>
                {/* View mode toggle */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{savedKeywords.length}</span> {savedKeywords.length === 1 ? "palavra no plano" : "palavras no plano"}
                  </p>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30">
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        viewMode === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Ver como cards"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        viewMode === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                      aria-label="Ver como lista"
                    >
                      <List className="w-3.5 h-3.5" /> Lista
                    </button>
                  </div>
                </div>

                {viewMode === "list" ? (
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30 text-left">
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Palavra</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Página alvo</th>
                            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedKeywords.map((kw, idx) => {
                            const isEditing = editingTargetId === kw.id;
                            const targetDisplay = kw.target_url
                              ? kw.target_url.replace(/^https?:\/\//, "")
                              : null;
                            return (
                              <tr key={kw.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors group ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-semibold">{kw.keyword}</p>
                                  {(kw.search_volume > 0 || kw.position_current) && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                      {kw.search_volume > 0 && <span>{kw.search_volume.toLocaleString("pt-BR")}/mês</span>}
                                      {kw.position_current && <span>Pos. {kw.position_current}</span>}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 max-w-xs">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center flex-1 min-w-0 h-7 rounded-md border border-input bg-background overflow-hidden">
                                        <span className="px-2 text-[11px] font-mono text-muted-foreground bg-muted/40 h-full flex items-center whitespace-nowrap select-none border-r border-input">
                                          {domainPrefix}/
                                        </span>
                                        <input
                                          type="text"
                                          value={editingTargetValue}
                                          onChange={(e) => setEditingTargetValue(e.target.value.replace(/^\/+/, ""))}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") saveTarget(kw.id);
                                            if (e.key === "Escape") cancelEditTarget();
                                          }}
                                          placeholder="pagina-alvo"
                                          className="flex-1 min-w-0 h-full px-2 text-xs bg-transparent outline-none"
                                          autoFocus
                                        />
                                      </div>
                                      <button onClick={() => saveTarget(kw.id)} disabled={savingTarget} className="text-success hover:text-success/80 p-1">
                                        {savingTarget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      </button>
                                      <button onClick={cancelEditTarget} className="text-muted-foreground hover:text-foreground p-1">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => startEditTarget(kw)}
                                      className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors cursor-pointer w-full text-left"
                                    >
                                      <MapPin className={`w-3 h-3 shrink-0 ${targetDisplay ? "text-primary" : "text-muted-foreground"}`} />
                                      <span className={`truncate ${targetDisplay ? "text-foreground font-medium" : "text-muted-foreground italic"}`}>
                                        {targetDisplay ?? "Definir página"}
                                      </span>
                                      <Pencil className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <Button size="sm" onClick={() => createIndicacao(kw)} className="h-8 gap-1">
                                      <LinkIcon className="w-3 h-3" /> Backlink
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => escreverArtigo(kw.keyword)} className="h-8 gap-1">
                                      <FileText className="w-3 h-3" /> Artigo
                                    </Button>
                                    <button
                                      onClick={() => removeKeyword(kw.id)}
                                      className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer p-1.5"
                                      aria-label="Remover"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedKeywords.map((kw) => {
                  const isEditing = editingTargetId === kw.id;
                  const targetDisplay = kw.target_url
                    ? kw.target_url.replace(/^https?:\/\//, "")
                    : null;
                  return (
                    <Card key={kw.id} className="card-interactive group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-base truncate mb-1">{kw.keyword}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {kw.search_volume > 0 && <span>{kw.search_volume.toLocaleString("pt-BR")} buscas/mês</span>}
                              {kw.search_volume > 0 && kw.difficulty > 0 && <span className="text-muted-foreground/50">·</span>}
                              {kw.difficulty > 0 && <span>Dificuldade {kw.difficulty}</span>}
                              {kw.position_current && <><span className="text-muted-foreground/50">·</span><span>Posição {kw.position_current}</span></>}
                            </div>
                          </div>
                          <button
                            onClick={() => removeKeyword(kw.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive cursor-pointer p-1"
                            aria-label="Remover palavra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Target URL row */}
                        <div className="mb-4 px-3 py-2.5 rounded-lg bg-muted/30">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <div className="flex items-center flex-1 min-w-0 h-8 rounded-md border border-input bg-background overflow-hidden">
                                <span className="px-2.5 text-[11px] font-mono text-muted-foreground bg-muted/40 h-full flex items-center whitespace-nowrap select-none border-r border-input">
                                  {domainPrefix}/
                                </span>
                                <input
                                  type="text"
                                  placeholder="produtos/cosmetico-natural"
                                  value={editingTargetValue}
                                  onChange={(e) => setEditingTargetValue(e.target.value.replace(/^\/+/, ""))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTarget(kw.id);
                                    if (e.key === "Escape") cancelEditTarget();
                                  }}
                                  className="flex-1 min-w-0 h-full px-2.5 text-xs bg-transparent outline-none"
                                  autoFocus
                                />
                              </div>
                              <Button size="sm" onClick={() => saveTarget(kw.id)} disabled={savingTarget} className="h-8 px-3">
                                {savingTarget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              </Button>
                              <button onClick={cancelEditTarget} className="text-muted-foreground hover:text-foreground p-1">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditTarget(kw)}
                              className="flex items-center gap-2 text-xs w-full text-left hover:text-foreground transition-colors cursor-pointer"
                            >
                              <MapPin className={`w-3.5 h-3.5 shrink-0 ${targetDisplay ? "text-primary" : "text-muted-foreground"}`} />
                              <span className={`flex-1 truncate ${targetDisplay ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {targetDisplay ?? "Definir página alvo (opcional)"}
                              </span>
                              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            className="flex-1 gap-2"
                            onClick={() => createIndicacao(kw)}
                          >
                            <LinkIcon className="w-4 h-4" /> Criar backlink
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => escreverArtigo(kw.keyword)}
                          >
                            <FileText className="w-4 h-4" /> Escrever artigo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* TAB: BUSCAR */}
        {tab === "buscar" && (
          <motion.div
            key="buscar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    Pesquise uma palavra pra ver dados reais do Google e descobrir variações.
                  </p>
                  {searchUsage && (
                    <span className={`text-xs font-mono px-2.5 py-1 rounded font-semibold ${
                      searchUsage.used >= searchUsage.limit ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    }`}>
                      {searchUsage.used}/{searchUsage.limit} hoje
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Ex: cosmético natural, melhor shampoo, ..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchTerm.trim() && !searching && doSearch()}
                      className="pl-12 h-12 text-base"
                    />
                  </div>
                  <Button onClick={doSearch} disabled={!searchTerm.trim() || searching} size="lg" className="h-12 gap-2">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Buscar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {searching && (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Buscando dados no Google...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {searchResults.length} palavra{searchResults.length === 1 ? "" : "s"} relacionada{searchResults.length === 1 ? "" : "s"} a <span className="text-foreground font-semibold">"{searchSeed}"</span>
                  </p>
                  {selectedToAdd.size > 0 && (
                    <Button
                      size="sm"
                      onClick={addSelected}
                      disabled={bulkAdding}
                      className="gap-2"
                    >
                      {bulkAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Adicionar {selectedToAdd.size} ao plano
                    </Button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {searchResults.map((r) => {
                    const isSelected = selectedToAdd.has(r.keyword);
                    return (
                      <button
                        key={r.keyword}
                        type="button"
                        onClick={() => !r.inList && toggleSelected(r.keyword)}
                        disabled={r.inList}
                        className={`w-full text-left rounded-xl border-2 p-4 sm:p-6 transition-all ${
                          r.inList ? "opacity-50 cursor-not-allowed border-border" :
                          isSelected ? "border-primary bg-primary/5 cursor-pointer" :
                          "border-border bg-card hover:border-primary/40 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-primary border-primary" :
                            r.inList ? "bg-success/20 border-success" :
                            "border-border"
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                            {r.inList && <Check className="w-4 h-4 text-success" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold truncate mb-1">{r.keyword}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span>{r.volume.toLocaleString("pt-BR")} buscas/mês</span>
                              <span className="text-muted-foreground/50">·</span>
                              <span>Dificuldade {r.difficulty}</span>
                              {r.cpc > 0 && <><span className="text-muted-foreground/50">·</span><span>R$ {r.cpc.toFixed(2)} por clique</span></>}
                            </div>
                          </div>
                          {r.inList && <Badge variant="success" className="text-[10px] shrink-0">No plano</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {!searching && searchResults.length === 0 && searchSeed && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Nenhuma palavra encontrada pra "{searchSeed}".</p>
                  <p className="text-xs text-muted-foreground mt-1">Tenta outra palavra mais comum.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create backlink dialog */}
      <CreateBacklinkDialog
        open={!!createBacklinkKwId}
        onClose={() => setCreateBacklinkKwId(null)}
        initialKeywordId={createBacklinkKwId ?? undefined}
        onCreated={() => setCreateBacklinkKwId(null)}
      />
    </div>
  );
}
