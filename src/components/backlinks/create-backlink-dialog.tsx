"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Loader2, Plus, Search, Sparkles, Link2, Hash, Check, Shuffle, BookText, Globe, Pencil, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { planAnchors, ANCHOR_TYPE_LABEL } from "@/lib/anchors";
import type { AnchorType } from "@/lib/types";

type SavedKeyword = {
  id: string;
  keyword: string;
  target_url: string | null;
};

type NetworkSiteOption = {
  id: string;
  domain: string;
  niche: string | null;
  da: number | null;
};

type Mode = "keyword" | "url";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-select a keyword (e.g. when called from a keyword card) */
  initialKeywordId?: string;
  /** Called after backlinks are created. Receives count created. */
  onCreated?: (count: number) => void;
};

const NICHE_COMPAT: Record<string, string[]> = {
  "Tecnologia": ["Marketing", "Jogos", "E-commerce", "Educação", "Finanças"],
  "Saúde": ["Esportes", "Alimentação", "Beleza", "Sustentabilidade", "Infantil"],
  "Finanças": ["E-commerce", "Marketing", "Educação", "Jurídico", "Tecnologia", "Imobiliário", "Contabilidade"],
  "Contabilidade": ["Finanças", "Jurídico", "E-commerce"],
  "Educação": ["Tecnologia", "Marketing", "Finanças", "Infantil"],
  "E-commerce": ["Marketing", "Tecnologia", "Moda", "Finanças", "Beleza"],
  "Marketing": ["Tecnologia", "E-commerce", "Educação", "Finanças"],
  "Jurídico": ["Finanças", "Imobiliário", "Educação", "Contabilidade"],
  "Imobiliário": ["Construção", "Finanças", "Jurídico"],
  "Alimentação": ["Saúde", "Sustentabilidade", "Agronegócio", "Viagem"],
  "Automotivo": ["Tecnologia", "E-commerce", "Esportes", "Finanças"],
  "Moda": ["Beleza", "E-commerce", "Sustentabilidade", "Viagem"],
  "Beleza": ["Saúde", "Moda", "E-commerce", "Alimentação"],
  "Pets": ["Saúde", "E-commerce", "Agronegócio"],
  "Viagem": ["Alimentação", "Esportes", "Sustentabilidade", "Moda"],
  "Esportes": ["Saúde", "Alimentação", "Tecnologia"],
  "Jogos": ["Tecnologia", "Esportes", "E-commerce"],
  "Infantil": ["Educação", "Saúde", "E-commerce", "Alimentação"],
  "Agronegócio": ["Alimentação", "Sustentabilidade", "Pets"],
  "Construção": ["Imobiliário", "Sustentabilidade", "Tecnologia"],
  "Sustentabilidade": ["Alimentação", "Construção", "Agronegócio", "Tecnologia"],
};

function scoreSiteClient(site: NetworkSiteOption, userNiche: string | null): number {
  const da = site.da ?? 0;
  const daScore = Math.min(30, Math.round(da * 0.6));
  if (!userNiche || !site.niche) return daScore;
  const userLower = userNiche.toLowerCase();
  const netLower = site.niche.toLowerCase();
  if (netLower === userLower) return 70 + daScore;
  if (NICHE_COMPAT[userNiche]?.includes(site.niche) || NICHE_COMPAT[site.niche]?.includes(userNiche)) {
    return 50 + daScore;
  }
  const userCompat = new Set(NICHE_COMPAT[userNiche] ?? []);
  const netCompat = NICHE_COMPAT[site.niche] ?? [];
  if (netCompat.some(n => userCompat.has(n))) return 35 + daScore;
  return daScore;
}


function typeBadgeClass(t: AnchorType): string {
  switch (t) {
    case "exact":   return "bg-primary/15 text-primary";
    case "partial": return "bg-blue-500/15 text-blue-400";
    case "branded": return "bg-purple-500/15 text-purple-400";
    case "generic": return "bg-muted text-muted-foreground";
    case "url":     return "bg-emerald-500/15 text-emerald-400";
  }
}

function getSiteDomain(siteUrl: string): string {
  try {
    const u = new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}

export function CreateBacklinkDialog({ open, onClose, initialKeywordId, onCreated }: Props) {
  const { activeSite, activeSiteId } = useSite();
  const [keywords, setKeywords] = useState<SavedKeyword[]>([]);
  const [loadingKw, setLoadingKw] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("keyword");
  const [selectedId, setSelectedId] = useState<string | null>(initialKeywordId ?? null);
  const [customPath, setCustomPath] = useState("");
  const [anchor, setAnchor] = useState("");
  const [networkSites, setNetworkSites] = useState<NetworkSiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [showAllSites, setShowAllSites] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customAnchors, setCustomAnchors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const quantity = selectedSiteIds.length;

  // Load user's keyword plan
  useEffect(() => {
    if (!open || !activeSiteId) return;
    setLoadingKw(true);
    const supabase = createClient();
    supabase
      .from("keywords")
      .select("id, keyword, target_url")
      .eq("client_site_id", activeSiteId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setKeywords((data ?? []) as SavedKeyword[]);
        setLoadingKw(false);
      });
  }, [open, activeSiteId]);

  // Load network sites — ordenados por niche match + DA, mas SEM pré-seleção
  // (a Marina escolhe explicitamente quais quer)
  useEffect(() => {
    if (!open) return;
    setLoadingSites(true);
    const supabase = createClient();
    supabase
      .from("network_sites")
      .select("id, domain, niche, da")
      .eq("status", "active")
      .then(({ data }) => {
        const sites = (data ?? []) as NetworkSiteOption[];
        const userNiche = activeSite?.niche_primary ?? null;
        const ranked = [...sites].sort(
          (a, b) => scoreSiteClient(b, userNiche) - scoreSiteClient(a, userNiche),
        );
        setNetworkSites(ranked);
        setSelectedSiteIds([]);
        setLoadingSites(false);
      });
  }, [open, activeSite?.niche_primary]);

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    setMode("keyword");
    setSelectedId(initialKeywordId ?? null);
    setCustomPath("");
    setSearch("");
    setShowAllSites(false);
    setCustomMode(false);
    setCustomAnchors([]);
  }, [open, initialKeywordId]);

  const selected = keywords.find(k => k.id === selectedId);

  // Auto-fill anchor when keyword changes (keyword mode) or clear when switching to url mode
  useEffect(() => {
    if (mode === "keyword") {
      setAnchor(selected ? selected.keyword : "");
    } else {
      setAnchor("");
    }
  }, [selected, mode]);

  // Personaliza âncoras por padrão no modo URL — quem escolhe URL específica
  // costuma ter texto de âncora em mente. Modo "Por palavra" usa automático.
  useEffect(() => {
    setCustomMode(mode === "url");
  }, [mode]);

  const siteUrlClean = (activeSite?.url ?? "").replace(/\/+$/, "");
  const siteDomain = getSiteDomain(siteUrlClean);

  const customTargetUrl = (() => {
    const path = customPath.trim().replace(/^\/+/, "");
    return path ? `${siteUrlClean}/${path}` : siteUrlClean;
  })();

  const finalTargetUrl = mode === "keyword"
    ? (selected?.target_url || siteUrlClean)
    : customTargetUrl;

  const finalKeyword = mode === "keyword"
    ? (selected?.keyword ?? "")
    : (anchor.trim() || "");

  const filteredKeywords = search.trim()
    ? keywords.filter(k => k.keyword.toLowerCase().includes(search.toLowerCase()))
    : keywords;

  const stage2Ready = mode === "keyword" ? !!selected : !!siteDomain;
  const canSubmit = stage2Ready
    && (mode === "keyword" || !!anchor.trim())
    && selectedSiteIds.length > 0
    && !creating;

  const toggleSite = (id: string) => {
    setSelectedSiteIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  };

  const anchorPreview = useMemo(() => {
    if (quantity <= 1 || !stage2Ready) return [];
    if (mode === "url" && !anchor.trim()) return [];
    return planAnchors({
      keyword: finalKeyword,
      targetUrl: finalTargetUrl,
      count: quantity,
      customAnchor: anchor,
    });
  }, [mode, stage2Ready, quantity, finalKeyword, finalTargetUrl, anchor]);

  // Populate custom anchors only when customMode is enabled
  useEffect(() => {
    if (!customMode) {
      setCustomAnchors([]);
      return;
    }
    setCustomAnchors(anchorPreview.map(a => a.text));
  }, [customMode, anchorPreview]);

  const updateCustomAnchor = (i: number, val: string) => {
    setCustomAnchors(prev => {
      const adjusted = [...prev];
      while (adjusted.length < quantity) adjusted.push("");
      adjusted[i] = val;
      return adjusted.slice(0, quantity);
    });
  };

  const resetCustomAnchors = () => {
    setCustomAnchors(anchorPreview.map(a => a.text));
  };

  const submit = async () => {
    if (!activeSiteId || !canSubmit) return;
    setCreating(true);
    try {
      const res = await fetch("/api/backlinks/create-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: activeSiteId,
          keyword: finalKeyword,
          targetUrl: finalTargetUrl,
          anchor: anchor.trim() || finalKeyword,
          networkSiteIds: selectedSiteIds,
          anchors: customMode && customAnchors.length === quantity
            ? customAnchors
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Não conseguimos criar agora.");
        return;
      }
      toast.success(
        data.created === 1
          ? "Backlink na fila — vamos gerar o artigo"
          : `${data.created} backlinks na fila — vão saindo nas próximas horas`
      );
      onCreated?.(data.created);
      onClose();
    } catch {
      toast.error("Não conseguimos falar com o servidor. Tente de novo.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Criar backlink
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Backlinks são links de outros sites apontando pro seu — quanto mais você tem, mais o Google confia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step 1: choose mode */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider font-mono font-semibold">
              1. Pra onde apontar?
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("keyword")}
                className={`flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  mode === "keyword"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <BookText className={`w-4 h-4 ${mode === "keyword" ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-semibold ${mode === "keyword" ? "text-primary" : ""}`}>
                  Por palavra
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Aponta pra uma palavra do seu plano.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("url")}
                className={`flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                  mode === "url"
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <Globe className={`w-4 h-4 ${mode === "url" ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-semibold ${mode === "url" ? "text-primary" : ""}`}>
                  URL específica
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Aponta pra uma página do seu site.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2a: pick keyword */}
          {mode === "keyword" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label className="text-xs uppercase tracking-wider font-mono font-semibold">
                2. Qual palavra?
              </Label>

              {loadingKw ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : keywords.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-lg border border-dashed border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Você ainda não tem palavras no plano.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={onClose} asChild>
                      <a href="/palavras">Adicionar palavra</a>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setMode("url")}>
                      Ou usar URL
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {keywords.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Filtrar palavras..."
                        className="pl-9 h-9 text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="max-h-[200px] overflow-y-auto space-y-1 border border-border rounded-lg p-1">
                    {filteredKeywords.map((kw) => {
                      const isSelected = selectedId === kw.id;
                      return (
                        <button
                          key={kw.id}
                          type="button"
                          onClick={() => setSelectedId(kw.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors cursor-pointer ${
                            isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className={`${isSelected ? "font-semibold text-foreground" : ""} truncate`}>
                            {kw.keyword}
                          </span>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {kw.target_url && (
                              <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[140px]">
                                {kw.target_url.replace(/^https?:\/\//, "").slice(0, 30)}
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                    {filteredKeywords.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        Nenhuma palavra encontrada.
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Step 2b: custom URL with locked domain */}
          {mode === "url" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label className="text-xs uppercase tracking-wider font-mono font-semibold">
                2. Página de destino
              </Label>
              {siteDomain ? (
                <div className="flex items-stretch rounded-lg border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
                  <div className="flex items-center px-3 bg-muted/40 border-r border-border shrink-0">
                    <span className="text-sm font-mono text-muted-foreground">
                      {siteDomain}/
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customPath}
                    onChange={e => setCustomPath(e.target.value)}
                    placeholder="produto/exemplo (vazio = home)"
                    className="flex-1 px-3 py-2 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-3 rounded-lg border border-dashed border-border">
                  Nenhum site ativo encontrado.
                </div>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Por segurança, o domínio é travado no site cadastrado. Cole só o caminho da página.
              </p>
            </motion.div>
          )}

          {/* Step 3: anchor */}
          {stage2Ready && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label className="text-xs uppercase tracking-wider font-mono font-semibold flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> 3. Texto do link (âncora)
              </Label>
              <Input
                value={anchor}
                onChange={e => setAnchor(e.target.value)}
                placeholder={mode === "keyword" ? selected?.keyword : "ex: nosso produto"}
                className="h-10 text-sm"
              />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {mode === "keyword"
                  ? "É o texto azul que vira o link no artigo do parceiro. Por padrão, usamos a própria palavra."
                  : "É o texto azul que vira o link no artigo do parceiro."}
              </p>
            </motion.div>
          )}

          {/* Step 4: pick network sites */}
          {stage2Ready && (mode === "keyword" || !!anchor.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wider font-mono font-semibold">
                  4. Em quais sites parceiros?
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {selectedSiteIds.length} de {networkSites.length} selecionado{selectedSiteIds.length === 1 ? "" : "s"}
                </span>
              </div>

              {loadingSites ? (
                <div className="flex items-center justify-center py-6 border border-border rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : networkSites.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Nenhum site parceiro disponível agora. Tente em alguns minutos.
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-border max-h-[260px] overflow-y-auto">
                    {(showAllSites ? networkSites : networkSites.slice(0, 8)).map(site => {
                      const isSelected = selectedSiteIds.includes(site.id);
                      const userNiche = activeSite?.niche_primary ?? null;
                      const niceMatch = userNiche && site.niche
                        && (site.niche.toLowerCase() === userNiche.toLowerCase()
                          || NICHE_COMPAT[userNiche]?.includes(site.niche));
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => toggleSite(site.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer border-b border-border/50 last:border-b-0 ${
                            isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-border"
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-mono truncate ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                              {site.domain}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {site.niche && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  niceMatch ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                                }`}>
                                  {site.niche}
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground">
                                AP {site.da ?? 0}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {networkSites.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSites(s => !s)}
                      className="text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      {showAllSites ? "Mostrar só os melhores" : `Ver todos os ${networkSites.length} sites`}
                    </button>
                  )}
                </>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" />
                Os melhores pro seu nicho ficam no topo. Você pode trocar marcando/desmarcando à vontade.
              </p>
            </motion.div>
          )}

          {/* Step 5: anchor preview / customization (only when > 1) */}
          {stage2Ready && quantity > 1 && anchorPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wider font-mono font-semibold flex items-center gap-1.5">
                  <Shuffle className="w-3 h-3" /> Variação dos textos
                </Label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <input
                    type="checkbox"
                    checked={customMode}
                    onChange={e => setCustomMode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border accent-primary cursor-pointer"
                  />
                  <Pencil className="w-3 h-3" />
                  Personalizar
                </label>
              </div>

              {!customMode ? (
                <div className="rounded-lg border border-border bg-muted/20 p-2 max-h-[180px] overflow-y-auto space-y-1">
                  {anchorPreview.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40"
                    >
                      <span className="text-sm truncate">{a.text}</span>
                      <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${typeBadgeClass(a.type)}`}>
                        {ANCHOR_TYPE_LABEL[a.type]}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-muted/20 p-2 max-h-[260px] overflow-y-auto space-y-1.5">
                    {customAnchors.map((val, i) => (
                      <div key={`anchor-${i}`} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground w-5 text-right shrink-0">
                          {i + 1}.
                        </span>
                        <input
                          type="text"
                          value={val}
                          onChange={e => updateCustomAnchor(i, e.target.value)}
                          placeholder={anchorPreview[i]?.text}
                          className="flex-1 h-8 px-2 text-sm bg-background border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/40"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={resetCustomAnchors}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resetar pra automático
                  </button>
                </>
              )}

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {customMode
                  ? "Edite cada linha — uma âncora por backlink. Linhas vazias usam a variação automática."
                  : "Variar os textos é o que faz o Google confiar — usar sempre a mesma palavra exata vira sinal de spam."}
              </p>
            </motion.div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-row">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={!canSubmit}
            className="gap-1.5 ml-auto"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {quantity === 0
              ? "Selecione ao menos 1 site"
              : `Criar ${quantity} ${quantity === 1 ? "backlink" : "backlinks"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
