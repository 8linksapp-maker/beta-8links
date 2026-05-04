"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Plus, Search, TrendingUp, Loader2, Check, X,
  FileText, Link as LinkIcon, Sparkles, ArrowRight,
  Trash2, MapPin, Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const SEARCH_LIMIT_DAILY = 10;

export default function PalavrasPage() {
  const router = useRouter();
  const { activeSite, loading: siteLoading } = useSite();
  const [tab, setTab] = useState<Tab>("plano");

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

  const startEditTarget = (kw: SavedKeyword) => {
    setEditingTargetId(kw.id);
    setEditingTargetValue(kw.target_url ?? "");
  };

  const cancelEditTarget = () => {
    setEditingTargetId(null);
    setEditingTargetValue("");
  };

  const saveTarget = async (id: string) => {
    setSavingTarget(true);
    const value = editingTargetValue.trim();
    const finalValue = value
      ? (value.startsWith("http") ? value : `https://${value}`)
      : null;
    const supabase = createClient();
    const { error } = await supabase
      .from("keywords")
      .update({ target_url: finalValue })
      .eq("id", id);
    if (error) {
      console.error("[palavras] failed to save target_url:", error);
      toast.error("Não conseguimos salvar. Tente de novo.");
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

  const createIndicacao = (kw: SavedKeyword) => {
    if (!activeSite) return;
    const targetUrl = kw.target_url || activeSite.url;
    router.push(`/keywords/select-site?keyword=${encodeURIComponent(kw.keyword)}&url=${encodeURIComponent(targetUrl)}&anchor=${encodeURIComponent(kw.keyword)}`);
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight">Suas palavras</h1>
        <p className="text-base text-muted-foreground mt-2 leading-relaxed max-w-2xl">
          As palavras que você quer aparecer no Google. Pra cada uma, você cria backlinks ou escreve artigos.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 w-fit">
        <button
          type="button"
          onClick={() => setTab("plano")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            tab === "plano" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Meu plano {savedKeywords.length > 0 && <span className="ml-1.5 text-xs font-mono text-muted-foreground">({savedKeywords.length})</span>}
        </button>
        <button
          type="button"
          onClick={() => setTab("buscar")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
            tab === "buscar" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Buscar palavra
        </button>
      </div>

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
                    <Search className="w-4 h-4" /> Buscar com dados
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* List */}
            {planLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : savedKeywords.length === 0 ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="w-9 h-9 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Seu plano está vazio</h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    Adicione palavras que você quer ver aparecer no Google. Pra cada palavra você pode criar backlinks ou escrever artigos.
                  </p>
                  <Button size="lg" onClick={() => setTab("buscar")} className="gap-2">
                    <Search className="w-5 h-5" /> Pesquisar primeira palavra
                  </Button>
                </CardContent>
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
                              <Input
                                placeholder="https://meusite.com.br/produtos/..."
                                value={editingTargetValue}
                                onChange={(e) => setEditingTargetValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveTarget(kw.id);
                                  if (e.key === "Escape") cancelEditTarget();
                                }}
                                className="h-8 text-xs flex-1"
                                autoFocus
                              />
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
                        className={`w-full text-left rounded-xl border-2 p-4 sm:p-5 transition-all ${
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
    </div>
  );
}
