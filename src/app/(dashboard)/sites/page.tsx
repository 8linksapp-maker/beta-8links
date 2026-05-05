"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import {
  Globe, Plus, Search, ExternalLink, TrendingUp,
  ArrowRight, Trash2, LinkIcon, Target, LayoutGrid, List,
  RefreshCw, Plug, MousePointerClick, Eye, Loader2, Check,
  Sparkles, Tag, Pencil, Globe2, GitBranch,
} from "lucide-react";

// Niche detector + Sentry-style picker is bulky. Defer until the user
// explicitly opens it.
const DetectNicheDialog = dynamic(
  () => import("@/components/sites/detect-niche-dialog").then(m => ({ default: m.DetectNicheDialog })),
  { ssr: false }
);
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { PLANS } from "@/lib/constants";

type ViewMode = "cards" | "list";

type EnrichedSite = {
  id: string;
  url: string;
  fullUrl: string;
  niche: string | null;
  da: number;
  backlinks: number;
  keywords: number;
  hasGoogle: boolean;
  hasWordpress: boolean;
  hasGithub: boolean;
  gscClicks: number | null;
  gscImpressions: number | null;
  gscPosition: number | null;
  lastSyncedAt: string | null;
};

const SYNC_COOLDOWN_DAYS = 30;
const SYNC_COOLDOWN_MS = SYNC_COOLDOWN_DAYS * 86400000;

function daysUntilNextSync(lastSyncedAt: string | null): number {
  if (!lastSyncedAt) return 0;
  const elapsed = Date.now() - new Date(lastSyncedAt).getTime();
  if (elapsed >= SYNC_COOLDOWN_MS) return 0;
  return Math.ceil((SYNC_COOLDOWN_MS - elapsed) / 86400000);
}

export default function SitesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sites: ctxSites, activeSiteId, setActiveSiteId, reload } = useSite();
  const [enrichedSites, setEnrichedSites] = useState<EnrichedSite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const enrichSites = useCallback(async () => {
    const supabase = createClient();

    const enriched = await Promise.all(ctxSites.map(async (s: any) => {
      const [kwRes, blRes] = await Promise.all([
        supabase.from("keywords").select("id", { count: "exact", head: true }).eq("client_site_id", s.id),
        supabase.from("external_backlinks").select("backlink_count").eq("client_site_id", s.id),
      ]);

      const localBacklinks = (blRes.data ?? []).reduce((sum: number, r: any) => sum + (r.backlink_count ?? 1), 0);
      // Prefer the cached total from DataForSEO summary if synced; fallback to local count
      const totalBacklinks = s.external_backlinks_total ?? localBacklinks;

      const rawPos = s.gsc_avg_position;
      const gscPosition = rawPos !== null && rawPos !== undefined ? Number(rawPos) : null;

      return {
        id: s.id,
        url: s.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "",
        fullUrl: s.url,
        niche: s.niche_primary ?? null,
        da: s.da_current ?? 0,
        backlinks: totalBacklinks,
        keywords: kwRes.count ?? 0,
        hasGoogle: !!s.google_refresh_token,
        hasWordpress: !!s.wp_url,
        hasGithub: !!s.github_token,
        gscClicks: s.gsc_clicks_28d ?? null,
        gscImpressions: s.gsc_impressions_28d ?? null,
        gscPosition,
        lastSyncedAt: s.last_synced_at ?? null,
      } as EnrichedSite;
    }));

    setEnrichedSites(enriched);
    setLoaded(true);
  }, [ctxSites]);

  useEffect(() => {
    if (ctxSites.length === 0) { setLoaded(true); return; }
    enrichSites();
  }, [ctxSites, enrichSites]);

  const syncMetrics = useCallback(async (siteId: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}/sync-metrics`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Não conseguimos atualizar agora.");
        return;
      }
      toast.success("Métricas atualizadas");
      await reload();
    } catch {
      toast.error("Não conseguimos falar com o Google. Tente em alguns instantes.");
    }
  }, [reload]);

  // Auto-sync after returning from Google OAuth (initiated from /integracoes)
  useEffect(() => {
    const success = searchParams.get("success");
    const siteIdParam = searchParams.get("siteId");
    if (success === "google_connected" && siteIdParam) {
      router.replace("/sites");
      reload().then(() => syncMetrics(siteIdParam));
    } else if (searchParams.get("error")) {
      toast.error("Não conseguimos conectar com o Google. Tente de novo.");
      router.replace("/sites");
    }
  }, [searchParams, router, reload, syncMetrics]);

  // Detect niche dialog
  const [detectingSite, setDetectingSite] = useState<{ id: string; url: string; currentNiche: string | null } | null>(null);
  const openDetect = (siteId: string, fullUrl: string, currentNiche: string | null) => {
    setDetectingSite({ id: siteId, url: fullUrl, currentNiche });
  };
  const closeDetect = () => setDetectingSite(null);
  const onNicheSaved = (niche: string | null) => {
    setEnrichedSites(prev => prev.map(s =>
      s.id === detectingSite?.id ? { ...s, niche } : s
    ));
    reload();
  };

  const filtered = searchQuery
    ? enrichedSites.filter(s => s.url.includes(searchQuery.toLowerCase()) || (s.niche?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false))
    : enrichedSites;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Site limit check
  const [siteLimit, setSiteLimit] = useState(999);
  const [planName, setPlanName] = useState("Starter");
  const [subStatus, setSubStatus] = useState("trialing");

  useEffect(() => {
    async function checkPlan() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("plan_id, subscription_status").eq("id", user.id).single();
      if (profile) {
        const planId = (profile.plan_id || "starter") as keyof typeof PLANS;
        const plan = PLANS[planId] ?? PLANS.starter;
        setSiteLimit(plan.limits.sites);
        setPlanName(plan.name);
        setSubStatus(profile.subscription_status ?? "trialing");
      }
    }
    checkPlan();
  }, []);

  const isAtLimit = enrichedSites.length >= siteLimit;
  const isActive = ["active", "trialing"].includes(subStatus);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const supabase = createClient();

    // 1. Get all published backlinks for this site to delete from network sites
    const { data: backlinks } = await supabase
      .from("backlinks")
      .select("id, published_url, network_sites(domain)")
      .eq("client_site_id", deleteId);

    // 2. Delete published posts from network sites
    for (const bl of backlinks ?? []) {
      if (bl.published_url) {
        const slug = bl.published_url.split("/").pop();
        const domain = (bl as any).network_sites?.domain;
        if (slug && domain) {
          try {
            await fetch("/api/admin/delete-post", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ domain, slug }),
            });
          } catch {}
        }
      }
    }

    // 3. Delete backlinks (cascade from client_sites should handle this,
    //    but explicit delete ensures network_posts cleanup above runs first)
    await supabase.from("backlinks").delete().eq("client_site_id", deleteId);

    // 4. Delete keywords
    await supabase.from("keywords").delete().eq("client_site_id", deleteId);

    // 5. Delete the site
    const { error } = await supabase.from("client_sites").delete().eq("id", deleteId);
    setDeleting(false);
    if (error) { toast.error(`Erro: ${error.message}`); return; }
    toast.success("Site e todos os backlinks removidos!");
    setDeleteId(null);
    reload();
  };

  const handleSelectSite = (siteId: string) => {
    setActiveSiteId(siteId);
    router.push("/dashboard");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black font-[family-name:var(--font-display)] tracking-tight">Meus sites</h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Os sites que você quer subir no Google.
          </p>
        </div>
        <Button size="lg" className="shrink-0 gap-2" disabled={isAtLimit || !isActive} onClick={() => {
          if (!isActive) { toast.error("Ative sua assinatura para adicionar sites."); return; }
          if (isAtLimit) { toast.error(`Limite de ${siteLimit} site${siteLimit > 1 ? "s" : ""} atingido no plano ${planName}. Faça upgrade.`); return; }
          router.push("/sites/new");
        }}>
          <Plus className="w-5 h-5" /> Adicionar site
        </Button>
      </motion.div>

      {/* Search + view toggle */}
      {enrichedSites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="flex items-center gap-3 flex-wrap">
          {enrichedSites.length > 1 && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Buscar por domínio ou nicho..." className="pl-10 h-11 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 ml-auto">
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
        </motion.div>
      )}

      {/* Sites */}
      {loaded && enrichedSites.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="Nenhum site cadastrado"
          description="Adicione seu primeiro site para começar"
          action={{ label: "Adicionar Site", onClick: () => router.push("/sites/new") }}
        />
      ) : viewMode === "list" ? (
        <SitesList
          sites={filtered}
          activeSiteId={activeSiteId}
          onSelect={handleSelectSite}
          onDelete={(id) => setDeleteId(id)}
          onDetectNiche={(id, fullUrl, currentNiche) => openDetect(id, fullUrl, currentNiche)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((site, index) => {
            const synced = site.lastSyncedAt !== null && site.gscClicks !== null;
            return (
            <motion.div key={site.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}>
              <Card className={`card-interactive relative overflow-hidden cursor-pointer ${activeSiteId === site.id ? 'ring-1 ring-primary/30' : ''}`}
                onClick={() => handleSelectSite(site.id)}>
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                <CardHeader className="pb-4 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                        <Globe className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg truncate flex items-center gap-2">
                          {site.url}
                          {activeSiteId === site.id && <Badge variant="default" className="text-[10px] px-1.5">ativo</Badge>}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {site.niche ? (
                            <Badge variant="outline" className="text-xs cursor-pointer hover:border-primary/50"
                              onClick={(e) => { e.stopPropagation(); openDetect(site.id, site.fullUrl, site.niche); }}>
                              {site.niche}
                            </Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openDetect(site.id, site.fullUrl, site.niche); }}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 cursor-pointer transition-colors font-semibold"
                            >
                              <Sparkles className="w-3 h-3" /> Definir nicho
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(site.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 relative">
                  {/* KPIs row — shows GSC metrics if synced, else basic stats */}
                  {synced ? (
                    <div className="grid grid-cols-3 gap-3">
                      <KpiTile icon={MousePointerClick} label="Cliques" value={site.gscClicks!} />
                      <KpiTile icon={Eye} label="Impressões" value={site.gscImpressions!} />
                      <KpiTile icon={TrendingUp} label="Posição" value={site.gscPosition!} format="position" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <KpiTile icon={Target} label="Palavras" value={site.keywords} />
                      <KpiTile icon={LinkIcon} label="Backlinks" value={site.backlinks} />
                      <KpiTile icon={TrendingUp} label="DA" value={site.da} />
                    </div>
                  )}

                  {/* Conexões pendentes */}
                  <ConnectionsAlert site={site} variant="card" />

                  {/* CTA */}
                  <Button variant="outline" className="w-full gap-2">
                    {activeSiteId === site.id ? "Abrir painel" : "Selecionar e abrir"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Detect niche dialog */}
      <DetectNicheDialog
        siteId={detectingSite?.id ?? null}
        siteUrl={detectingSite?.url ?? ""}
        currentNiche={detectingSite?.currentNiche ?? null}
        open={!!detectingSite}
        onClose={closeDetect}
        onSaved={onNicheSaved}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Site</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Essa ação é <strong className="text-destructive">irreversível</strong>. Serão excluídos permanentemente:</p>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                <li>O site e todas as configurações</li>
                <li>Todos os backlinks criados</li>
                <li>Artigos publicados nos sites parceiros</li>
                <li>Keywords e dados de monitoramento</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo tudo..." : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function pendingConnectionsCount(site: EnrichedSite): number {
  let pending = 0;
  if (!site.hasGoogle) pending++;
  if (!site.hasWordpress) pending++;
  if (!site.hasGithub) pending++;
  return pending;
}

function ConnectionsAlert({ site, variant = "card" }: { site: EnrichedSite; variant?: "card" | "row" }) {
  const pending = pendingConnectionsCount(site);
  if (pending === 0) return null;

  // No count — WordPress and GitHub are mutually exclusive, so a raw total
  // would mislead (the user can't connect all three).
  const text = "Conexões pendentes";

  if (variant === "row") {
    return (
      <Link
        href="/integracoes"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-light text-warning border border-warning/20 hover:bg-warning/15 transition-colors text-xs font-semibold"
      >
        <Plug className="w-3 h-3" /> {text}
      </Link>
    );
  }

  return (
    <Link
      href="/integracoes"
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-warning-light border border-warning/20 hover:bg-warning/15 transition-colors group"
    >
      <Plug className="w-4 h-4 text-warning shrink-0" />
      <span className="text-sm font-semibold flex-1">
        {text}
        <span className="block text-xs font-normal text-muted-foreground">
          Clique pra conectar e desbloquear funcionalidades
        </span>
      </span>
      <ArrowRight className="w-4 h-4 text-warning shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function KpiTile({ icon: Icon, label, value, format }: {
  icon: any; label: string; value: number; format?: "position";
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-muted/30">
      <div className="flex items-center justify-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
        {format === "position" ? value.toFixed(1) : <NumberTicker value={value} />}
      </p>
    </div>
  );
}

function SitesList({ sites, activeSiteId, onSelect, onDelete, onDetectNiche }: {
  sites: EnrichedSite[];
  activeSiteId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDetectNiche: (id: string, fullUrl: string, currentNiche: string | null) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Site</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Nicho</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Cliques</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Posição</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Palavras</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Backlinks</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Conexões</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site, idx) => {
              const synced = site.lastSyncedAt !== null && site.gscClicks !== null;
              return (
                <tr key={site.id}
                  className={`border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${idx % 2 === 0 ? "" : "bg-muted/5"} ${activeSiteId === site.id ? "bg-primary/5" : ""}`}
                  onClick={() => onSelect(site.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{site.url}</p>
                      {activeSiteId === site.id && <Badge variant="default" className="text-[9px] px-1.5">ativo</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {site.niche ? (
                      <button
                        type="button"
                        onClick={() => onDetectNiche(site.id, site.fullUrl, site.niche)}
                        className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/40 cursor-pointer transition-colors"
                        title="Trocar nicho"
                      >
                        <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">{site.niche}</span>
                        <Pencil className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => onDetectNiche(site.id, site.fullUrl, site.niche)}
                        className="gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Definir nicho
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {synced ? site.gscClicks!.toLocaleString("pt-BR") : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {synced && site.gscPosition !== null ? site.gscPosition.toFixed(1) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{site.keywords}</td>
                  <td className="px-4 py-3 text-sm font-mono">{site.backlinks}</td>
                  <td className="px-4 py-3">
                    {pendingConnectionsCount(site) === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-success font-semibold">
                        <Check className="w-3.5 h-3.5" /> Tudo conectado
                      </span>
                    ) : (
                      <ConnectionsAlert site={site} variant="row" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDelete(site.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer p-2"
                      aria-label="Excluir site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
