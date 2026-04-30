"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import {
  ArrowLeft, Globe, Shield, LinkIcon, Check, Loader2,
  Search, ArrowDown, ArrowUp, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { humanizeError } from "@/lib/utils/error-messages";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Suspense } from "react";

/**
 * Niche compatibility: bidirectional map.
 * "Complementar" = nichos que se conectam naturalmente.
 * Qualquer nicho pode linkar pra qualquer outro — o GPT gera o contexto.
 * O match % ajuda o usuário a escolher, mas não bloqueia nada.
 */
const NICHE_COMPAT: Record<string, string[]> = {
  "Tecnologia": ["Marketing", "Jogos", "E-commerce", "Educação", "Finanças"],
  "Saúde": ["Esportes", "Alimentação", "Beleza", "Sustentabilidade", "Infantil"],
  "Finanças": ["E-commerce", "Marketing", "Educação", "Jurídico", "Tecnologia", "Imobiliário"],
  "Educação": ["Tecnologia", "Marketing", "Finanças", "Infantil", "Desenvolvimento Pessoal"],
  "E-commerce": ["Marketing", "Tecnologia", "Moda", "Finanças", "Beleza"],
  "Marketing": ["Tecnologia", "E-commerce", "Educação", "Finanças", "Desenvolvimento Pessoal"],
  "Jurídico": ["Finanças", "Imobiliário", "Educação", "Negócios"],
  "Imobiliário": ["Construção", "Finanças", "Jurídico", "Casa e Decoração"],
  "Alimentação": ["Saúde", "Sustentabilidade", "Agronegócio", "Viagem", "Casa e Decoração"],
  "Automotivo": ["Tecnologia", "E-commerce", "Esportes", "Finanças"],
  "Moda": ["Beleza", "E-commerce", "Sustentabilidade", "Viagem"],
  "Beleza": ["Saúde", "Moda", "E-commerce", "Alimentação"],
  "Pets": ["Saúde", "E-commerce", "Agronegócio", "Casa e Decoração"],
  "Viagem": ["Alimentação", "Esportes", "Sustentabilidade", "Moda", "Entretenimento"],
  "Esportes": ["Saúde", "Alimentação", "Tecnologia", "Entretenimento"],
  "Jogos": ["Tecnologia", "Esportes", "E-commerce", "Entretenimento"],
  "Infantil": ["Educação", "Saúde", "E-commerce", "Alimentação"],
  "Agronegócio": ["Alimentação", "Sustentabilidade", "Pets", "Negócios"],
  "Construção": ["Imobiliário", "Sustentabilidade", "Tecnologia", "Casa e Decoração"],
  "Sustentabilidade": ["Alimentação", "Construção", "Agronegócio", "Tecnologia"],
  "Entretenimento": ["Viagem", "Esportes", "Jogos", "Moda"],
  "Casa e Decoração": ["Imobiliário", "Construção", "Alimentação", "Pets"],
  "Negócios": ["Finanças", "Marketing", "E-commerce", "Tecnologia", "Jurídico"],
  "Desenvolvimento Pessoal": ["Educação", "Marketing", "Saúde", "Esportes"],
  "Relacionamentos": ["Desenvolvimento Pessoal", "Entretenimento", "Saúde"],
  "Viagens e Turismo": ["Viagem", "Alimentação", "Esportes", "Moda"],
};

// Viagem/Turismo é relacionado com TODOS os nichos (funciona bem universalmente)
const UNIVERSAL_NICHES = ["Viagem", "Viagens e Turismo"];

function calculateMatch(userNiche: string | null, networkNiche: string, networkDa: number, userDa: number): { score: number; reason: string; type: "mesmo" | "complementar" | "relacionado" | "diferente" } {
  if (!userNiche) return { score: 50, reason: "Qualquer nicho", type: "diferente" };

  const userLower = userNiche.toLowerCase();
  const netLower = networkNiche.toLowerCase();

  let nicheScore = 0;
  let reason = "";
  let type: "mesmo" | "complementar" | "relacionado" | "diferente" = "diferente";

  // Same niche
  if (netLower === userLower || netLower.includes(userLower) || userLower.includes(netLower)) {
    nicheScore = 50;
    reason = "Mesmo nicho";
    type = "mesmo";
  }
  // Universal niches (Viagem relates to everything)
  else if (UNIVERSAL_NICHES.some(n => n.toLowerCase() === netLower) || UNIVERSAL_NICHES.some(n => n.toLowerCase() === userLower)) {
    nicheScore = 35;
    reason = "Nicho universal";
    type = "complementar";
  }
  // Complementary (direct connection)
  else if (NICHE_COMPAT[userNiche]?.includes(networkNiche) || NICHE_COMPAT[networkNiche]?.includes(userNiche)) {
    nicheScore = 40;
    reason = "Nicho complementar";
    type = "complementar";
  }
  // Related (2nd degree — share a common complementary niche)
  else {
    const userCompat = new Set(NICHE_COMPAT[userNiche] ?? []);
    const netCompat = NICHE_COMPAT[networkNiche] ?? [];
    const shared = netCompat.some(n => userCompat.has(n));
    if (shared) {
      nicheScore = 30;
      reason = "Nicho relacionado";
      type = "relacionado";
    } else {
      nicheScore = 20;
      reason = "Nicho diferente";
      type = "diferente";
    }
  }

  // DA bonus (0-30 pts)
  let daScore = 0;
  if (networkDa >= 30) daScore = 30;
  else if (networkDa >= 20) daScore = 25;
  else if (networkDa >= 10) daScore = 20;
  else daScore = 10;

  // Diversity bonus — different niche = diversidade de perfil de backlinks (bom para SEO)
  const diversityBonus = type === "diferente" ? 10 : type === "relacionado" ? 5 : 0;

  const score = Math.min(100, nicheScore + daScore + diversityBonus + 10);
  return { score, reason, type };
}

function SelectSiteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeSiteId, activeSite } = useSite();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"match" | "da" | "backlinks">("match");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [networkSites, setNetworkSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);

  const keyword = searchParams.get("keyword") ?? "";
  const targetUrl = searchParams.get("url") ?? "";
  const anchor = searchParams.get("anchor") ?? keyword;
  const userNiche = activeSite?.niche_primary ?? null;
  const userDa = (activeSite as any)?.da_current ?? 0;

  // Load network sites from DB + keyword counts
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("network_sites")
        .select("id, domain, niche, da, pa, spam_score, referring_domains, external_backlinks, site_context, categories, vercel_url")
        .eq("status", "active")
        .order("da", { ascending: false });

      // All active sites are available (GPT generates keywords on the fly)
      setNetworkSites((data ?? []).map((site: any) => ({ ...site, availableKeywords: 1 })));
      setLoadingSites(false);
    }
    load();
  }, []);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  // Enrich with match score
  const sites = networkSites.map(s => {
    const ctx = s.site_context ?? {};
    const matchResult = calculateMatch(userNiche, s.niche, s.da, userDa);
    return {
      ...s,
      topics: ctx.categories ?? s.categories ?? [],
      backlinks: s.external_backlinks ?? ctx.totalBacklinks ?? 0,
      referringDomains: s.referring_domains ?? 0,
      spamScore: s.spam_score ?? 0,
      match: matchResult.score,
      matchReason: matchResult.reason,
      matchType: matchResult.type,
      summary: ctx.gptSummary ?? "",
    };
  });

  const filtered = sites
    .filter(s => !search || s.niche.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      if (sortBy === "match") return (a.match - b.match) * mult;
      if (sortBy === "da") return (a.da - b.da) * mult;
      if (sortBy === "backlinks") return (a.backlinks - b.backlinks) * mult;
      return 0;
    });

  const handleConfirm = async () => {
    if (!selectedSite || !activeSiteId) return;
    setCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCreating(false); return; }

    const { data: inserted, error } = await supabase.from("backlinks").insert({
      user_id: user.id,
      client_site_id: activeSiteId,
      network_site_id: selectedSite,
      target_url: targetUrl,
      anchor_text: anchor,
      anchor_type: "partial",
      status: "queued",
    }).select().single();

    if (error) { setCreating(false); toast.error(`Erro: ${error.message}`); return; }

    // Navigate immediately, process in background
    setConfirmOpen(false);
    router.push("/backlinks");

    // Start processing with progress toasts
    toast("⏳ Backlink na fila — iniciando geração do artigo...", { duration: 3000 });

    try {
      setTimeout(() => toast("🔍 Analisando concorrentes e criando outline...", { duration: 5000 }), 3000);
      setTimeout(() => toast("✍️ Escrevendo artigo com IA...", { duration: 10000 }), 8000);

      const res = await fetch("/api/admin/process-backlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backlinkId: inserted.id }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success("✅ Backlink publicado! Artigo gerado com sucesso.", { duration: 6000 });
      } else {
        toast.error(result.error || humanizeError(result.detail).user, { duration: 5000 });
        console.error("[backlink] erro:", result.detail ?? result);
      }
    } catch (e) {
      toast.error(humanizeError(e).user);
      console.error("[backlink] erro de rede:", e);
    }
    setCreating(false);
  };

  const selected = sites.find(s => s.id === selectedSite);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Escolher site parceiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione onde publicar o backlink para <span className="text-foreground font-semibold">"{keyword}"</span>
        </p>
      </motion.div>

      {/* Target info */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="bg-primary-light/30 border-primary/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Backlink para</p>
              <p className="text-sm font-semibold truncate">{targetUrl}</p>
              <p className="text-xs text-muted-foreground">Âncora: <span className="text-foreground">{anchor}</span></p>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">Nicho: {userNiche ?? "—"}</Badge>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search + sort */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nicho..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-muted-foreground font-mono uppercase">Ordenar:</span>
          {(["match", "da", "backlinks"] as const).map(col => (
            <Button key={col} variant={sortBy === col ? "default" : "outline"} size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => toggleSort(col)}>
              {col === "match" ? "Match" : col === "da" ? "DA" : "Links"}
              {sortBy === col && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Sites grid */}
      {loadingSites ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((site, i) => (
          <Card key={site.id}
            className={`cursor-pointer transition-all hover:border-primary/30 ${selectedSite === site.id ? 'ring-2 ring-primary border-primary/30' : ''}`}
            onClick={() => setSelectedSite(site.id)}>
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono font-semibold">{site.domain}</span>
                </div>
                <Badge variant="outline"
                  className={`text-[10px] font-mono ${
                    site.matchType === "mesmo" ? "bg-success/15 text-success border-success/30" :
                    site.matchType === "complementar" ? "bg-primary/15 text-primary border-primary/30" :
                    site.matchType === "relacionado" ? "bg-info/15 text-info border-info/30" :
                    "text-muted-foreground"
                  }`}>
                  {site.match}%
                </Badge>
              </div>

              {/* Match reason + niche */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{site.niche}</Badge>
                <span className={`text-[10px] font-semibold ${
                  site.matchType === "mesmo" ? "text-success" :
                  site.matchType === "complementar" ? "text-primary" :
                  site.matchType === "relacionado" ? "text-info" :
                  "text-muted-foreground"
                }`}>
                  {site.matchReason}
                </span>
              </div>

              {/* Topics */}
              <div className="flex flex-wrap gap-1">
                {site.topics.map((t: string, j: number) => (
                  <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{t}</span>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="text-center p-1.5 rounded-lg bg-muted/30">
                  <p className="text-sm font-bold font-mono">{site.da}</p>
                  <p className="text-[7px] text-muted-foreground uppercase">DA</p>
                </div>
                <div className="text-center p-1.5 rounded-lg bg-muted/30">
                  <p className="text-sm font-bold font-mono">{site.referringDomains > 999 ? (site.referringDomains / 1000).toFixed(1) + "k" : site.referringDomains}</p>
                  <p className="text-[7px] text-muted-foreground uppercase">RDs</p>
                </div>
                <div className="text-center p-1.5 rounded-lg bg-muted/30">
                  <p className="text-sm font-bold font-mono">{site.backlinks > 999 ? (site.backlinks / 1000).toFixed(1) + "k" : site.backlinks}</p>
                  <p className="text-[7px] text-muted-foreground uppercase">Backlinks</p>
                </div>
              </div>

              {/* Site summary from GPT */}
              {site.summary && (
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed border-t border-border pt-2">
                  {site.summary}
                </p>
              )}

              {/* Select indicator */}
              {selectedSite === site.id && (
                <div className="flex items-center gap-2 text-xs text-primary font-semibold pt-1">
                  <Check className="w-4 h-4" /> Selecionado
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>
      )}

      {/* Bottom action bar */}
      {selectedSite && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 z-50">
          <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Site selecionado: <span className="font-mono">{selected?.domain}</span></p>
                <p className="text-xs text-muted-foreground">{selected?.niche} · DA {selected?.da} · {selected?.match}% match · {selected?.matchReason}</p>
              </div>
              <Button onClick={() => setConfirmOpen(true)} className="gap-2 shrink-0">
                <LinkIcon className="w-4 h-4" /> Criar backlink aqui
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar backlink</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Keyword:</span><span className="font-semibold">{keyword}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">URL destino:</span><span className="font-mono text-xs truncate max-w-[200px]">{targetUrl}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Âncora:</span><span className="font-semibold">{anchor}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Site parceiro:</span><span className="font-mono">{selected?.domain}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Match:</span><Badge variant="outline" className="text-[10px]">{selected?.match}%</Badge></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SelectSitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <SelectSiteContent />
    </Suspense>
  );
}
