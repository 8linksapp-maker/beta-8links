"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Link as LinkIcon, ExternalLink, Loader2, Play, Check,
  Plus, FileText, Trash2, AlertTriangle, Sparkles, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { humanizeError } from "@/lib/utils/error-messages";
// Heavy create dialog only loads when the user opens it.
const CreateBacklinkDialog = dynamic(
  () => import("@/components/backlinks/create-backlink-dialog").then(m => ({ default: m.CreateBacklinkDialog })),
  { ssr: false }
);

type Status = "queued" | "generating" | "ready_for_review" | "published" | "indexed" | "error";

type Backlink = {
  id: string;
  anchor_text: string;
  target_url: string;
  status: Status;
  error_message?: string | null;
  article_title?: string | null;
  article_content?: string | null;
  published_url?: string | null;
  created_at: string;
  network_sites?: { domain: string; niche: string } | null;
};

const STATUS_LABELS: Record<Status, string> = {
  queued: "Na fila",
  generating: "Gerando",
  ready_for_review: "Pendente",
  published: "Publicado",
  indexed: "Publicado",
  error: "Erro",
};

const STATUS_FILTERS: { value: "all" | Status; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "queued", label: "Na fila" },
  { value: "generating", label: "Gerando" },
  { value: "ready_for_review", label: "Pendentes" },
  { value: "published", label: "Publicados" },
  { value: "error", label: "Com erro" },
];

const PERIOD_FILTERS: { value: "all" | "today" | "7d" | "30d"; label: string }[] = [
  { value: "all", label: "Todo o período" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
];

export default function BacklinksPage() {
  const router = useRouter();
  const { activeSiteId, loading: siteLoading } = useSite();
  const [items, setItems] = useState<Backlink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Backlink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [processingFila, setProcessingFila] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (siteLoading || !activeSiteId) {
      if (!siteLoading) setLoaded(true);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("backlinks")
        .select("id, anchor_text, target_url, status, error_message, article_title, article_content, published_url, created_at, network_sites(domain, niche)")
        .eq("client_site_id", activeSiteId)
        .order("created_at", { ascending: false });
      if (error) console.error("[backlinks] load failed:", error);
      if (!cancelled) {
        setItems((data ?? []) as any);
        setLoaded(true);
      }
    }
    load();

    // Realtime — refetch whenever a backlink for this site changes. Replaces
    // the old 5-second poll for users who keep this tab open.
    const channel = supabase
      .channel(`backlinks:${activeSiteId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "backlinks", filter: `client_site_id=eq.${activeSiteId}` },
        () => { if (!cancelled) load(); }
      )
      .subscribe();

    // Slow safety-net poll if realtime publication is disabled in this env.
    const interval = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [activeSiteId, siteLoading]);

  // Apply filters
  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter(bl => {
      if (statusFilter !== "all") {
        if (statusFilter === "published" && bl.status !== "published" && bl.status !== "indexed") return false;
        if (statusFilter !== "published" && bl.status !== statusFilter) return false;
      }
      if (periodFilter !== "all") {
        const created = new Date(bl.created_at).getTime();
        const ageDays = (now - created) / 86400000;
        if (periodFilter === "today" && ageDays > 1) return false;
        if (periodFilter === "7d" && ageDays > 7) return false;
        if (periodFilter === "30d" && ageDays > 30) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          bl.anchor_text.toLowerCase().includes(q) ||
          bl.target_url.toLowerCase().includes(q) ||
          (bl.network_sites?.domain ?? "").toLowerCase().includes(q) ||
          (bl.article_title ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [items, statusFilter, periodFilter, search]);

  const queuedCount = items.filter(b => b.status === "queued").length;
  const readyCount = items.filter(b => b.status === "ready_for_review").length;
  const publishedCount = items.filter(b => b.status === "published" || b.status === "indexed").length;

  /**
   * Fase 1 — gera artigos pros backlinks que estão na fila (status=queued).
   * Usa após "Criar backlinks": dispara automaticamente pra ela revisar/publicar depois.
   * Não publica nada — apenas gera o conteúdo.
   */
  const generatePendingArticles = async (): Promise<void> => {
    if (!activeSiteId) return;
    setProcessingFila(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("backlinks")
      .select("id, anchor_text")
      .eq("client_site_id", activeSiteId)
      .eq("status", "queued");
    const queued = (data ?? []) as Array<{ id: string; anchor_text: string }>;

    if (queued.length === 0) {
      setProcessingFila(false);
      return;
    }

    toast(`Gerando ${queued.length} artigo${queued.length > 1 ? "s" : ""}...`);

    const errors: { anchor: string; reason: string }[] = [];
    const CONCURRENCY = 3;
    for (let i = 0; i < queued.length; i += CONCURRENCY) {
      await Promise.all(queued.slice(i, i + CONCURRENCY).map(async (bl) => {
        try {
          const res = await fetch("/api/admin/process-backlink", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ backlinkId: bl.id }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || body?.error) {
            errors.push({
              anchor: bl.anchor_text,
              reason: body?.error ?? humanizeError(body?.detail ?? `HTTP ${res.status}`).user,
            });
          }
        } catch (e) {
          errors.push({ anchor: bl.anchor_text, reason: humanizeError(e).user });
        }
      }));
    }

    const okCount = queued.length - errors.length;
    if (errors.length === 0) {
      toast.success(`${okCount} backlink${okCount > 1 ? "s prontos" : " pronto"} pra publicar`);
    } else if (okCount === 0) {
      toast.error(`Não foi possível gerar os artigos. ${errors[0].reason}`);
    } else {
      toast.warning(`${okCount} prontos, ${errors.length} com problema. Veja na lista.`);
    }

    setProcessingFila(false);
  };

  /**
   * Fase 2 — publica os backlinks que já estão prontos pra revisão (ready_for_review).
   * Disparado pelo botão "Publicar todos" no header.
   */
  const publishReadyBacklinks = async (): Promise<void> => {
    if (!activeSiteId) return;
    setProcessingFila(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("backlinks")
      .select("id, anchor_text, article_title, article_content, network_sites(domain)")
      .eq("client_site_id", activeSiteId)
      .eq("status", "ready_for_review");
    const ready = ((data ?? []) as unknown as Array<{
      id: string;
      anchor_text: string;
      article_title: string | null;
      article_content: string | null;
      network_sites: { domain: string } | null;
    }>).filter(b => b.article_content && b.network_sites?.domain);

    if (ready.length === 0) {
      toast("Nenhum backlink pronto pra publicar.");
      setProcessingFila(false);
      return;
    }

    toast(`Publicando ${ready.length} backlink${ready.length > 1 ? "s" : ""}...`);

    const errors: { anchor: string; reason: string }[] = [];
    let publishedOk = 0;
    const CONCURRENCY = 2;
    for (let i = 0; i < ready.length; i += CONCURRENCY) {
      await Promise.all(ready.slice(i, i + CONCURRENCY).map(async (bl) => {
        try {
          const res = await fetch("/api/admin/publish-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              backlinkId: bl.id,
              content: bl.article_content,
              title: bl.article_title,
              domain: bl.network_sites!.domain,
            }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok || body?.error) {
            errors.push({
              anchor: bl.anchor_text,
              reason: body?.error ?? humanizeError(`HTTP ${res.status}`).user,
            });
          } else publishedOk++;
        } catch (e) {
          errors.push({ anchor: bl.anchor_text, reason: humanizeError(e).user });
        }
      }));
    }

    if (errors.length === 0 && publishedOk > 0) {
      toast.success(`${publishedOk} backlink${publishedOk > 1 ? "s publicados" : " publicado"}`);
    } else if (publishedOk === 0 && errors.length > 0) {
      toast.error(`Não foi possível publicar. ${errors[0].reason}`);
    } else {
      toast.warning(`${publishedOk} publicado(s), ${errors.length} com problema. Veja na lista.`);
    }

    setProcessingFila(false);
  };

  const retry = async (bl: Backlink) => {
    const supabase = createClient();
    await supabase.from("backlinks").update({ status: "queued", error_message: null }).eq("id", bl.id);
    toast(`Tentando "${bl.anchor_text}" de novo...`);
    try {
      const res = await fetch("/api/admin/process-backlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backlinkId: bl.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) toast.error(body?.error ?? humanizeError(body?.detail ?? `HTTP ${res.status}`).user);
      else toast.success("Concluído");
    } catch (e) {
      toast.error(humanizeError(e).user);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const supabase = createClient();

    if (deleteConfirm.published_url && deleteConfirm.network_sites?.domain) {
      try {
        const slug = deleteConfirm.published_url.split("/").pop();
        await fetch("/api/admin/delete-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: deleteConfirm.network_sites.domain, slug }),
        });
      } catch {}
    }

    await supabase.from("backlinks").delete().eq("id", deleteConfirm.id);
    setItems(prev => prev.filter(b => b.id !== deleteConfirm.id));
    setDeleteConfirm(null);
    setDeleting(false);
    toast.success("Backlink excluído");
  };

  if (siteLoading || !loaded) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-display)] tracking-tight">Backlinks</h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Os backlinks que você criou pra subir seu site no Google.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {queuedCount > 0 && processingFila && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando {queuedCount} artigo{queuedCount > 1 ? "s" : ""}...
            </span>
          )}
          {readyCount > 0 && (
            <Button variant="outline" size="lg" onClick={publishReadyBacklinks} disabled={processingFila} className="gap-2">
              {processingFila ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Publicar todos ({readyCount})
            </Button>
          )}
          <Button size="lg" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-5 h-5" /> Criar backlink
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        // Empty state
        <div>
          <Card>
            <CardContent className="py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-9 h-9 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">Nenhum backlink ainda</h3>
              <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                Backlinks são links de outros sites apontando pro seu — quanto mais você tem, mais o Google confia.
                Comece criando o primeiro a partir de uma palavra do seu plano.
              </p>
              <Button size="lg" className="gap-2" onClick={() => setCreateOpen(true)}>
                <Plus className="w-5 h-5" /> Criar primeiro backlink
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                    statusFilter === f.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por âncora, página ou site..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-11 text-base"
                />
              </div>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="h-11 px-4 rounded-lg border border-border bg-card text-sm cursor-pointer hover:border-primary/30"
              >
                {PERIOD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Mostrando {filtered.length} de {items.length} backlinks · {publishedCount} publicado{publishedCount === 1 ? "" : "s"}
            </p>
          </div>

          {/* Table (desktop) */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Âncora</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Página de destino</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Site parceiro</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Quando</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((bl, idx) => (
                      <tr key={bl.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                        <td className="px-4 py-4"><StatusBadge status={bl.status} /></td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold">{bl.anchor_text}</p>
                          {bl.error_message && (
                            <p className="text-xs text-destructive mt-1 max-w-xs truncate" title={bl.error_message}>{bl.error_message}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <span className="font-mono truncate block max-w-[180px]" title={bl.target_url}>
                            {bl.target_url.replace(/^https?:\/\//, "")}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          {bl.network_sites?.domain ?? <span className="text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {timeAgo(bl.created_at)}
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <RowActions
                            bl={bl}
                            onReview={() => router.push(`/backlinks/${bl.id}/review`)}
                            onRetry={() => retry(bl)}
                            onDelete={() => setDeleteConfirm(bl)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum backlink encontrado com esses filtros.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum backlink encontrado com esses filtros.</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map(bl => (
                <Card key={bl.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={bl.status} />
                      <span className="text-xs text-muted-foreground">{timeAgo(bl.created_at)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{bl.anchor_text}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">→ {bl.target_url.replace(/^https?:\/\//, "")}</p>
                      {bl.network_sites?.domain && <p className="text-xs text-muted-foreground mt-1">em {bl.network_sites.domain}</p>}
                      {bl.error_message && <p className="text-xs text-destructive mt-1.5">{bl.error_message}</p>}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <RowActions
                        bl={bl}
                        onReview={() => router.push(`/backlinks/${bl.id}/review`)}
                        onRetry={() => retry(bl)}
                        onDelete={() => setDeleteConfirm(bl)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* Create backlink dialog */}
      <CreateBacklinkDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          // Refresh local list e dispara geração do artigo automaticamente.
          // O usuário NÃO publica nada ainda — fica em "ready_for_review" pra
          // ele revisar individualmente OU clicar em "Publicar todos".
          if (activeSiteId) {
            const supabase = createClient();
            supabase
              .from("backlinks")
              .select("id, anchor_text, target_url, status, error_message, article_title, article_content, published_url, created_at, network_sites(domain, niche)")
              .eq("client_site_id", activeSiteId)
              .order("created_at", { ascending: false })
              .then(({ data }) => setItems((data ?? []) as any));
          }
          generatePendingArticles();
        }}
      />

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Excluir backlink
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Essa ação é <span className="text-destructive font-bold">irreversível</span>. Se o backlink já está publicado, o artigo também será removido.
            </p>
            {deleteConfirm && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Texto:</span> <span className="font-semibold">{deleteConfirm.anchor_text}</span></p>
                {deleteConfirm.network_sites?.domain && <p><span className="text-muted-foreground">Site:</span> {deleteConfirm.network_sites.domain}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RowActions({ bl, onReview, onRetry, onDelete }: {
  bl: Backlink; onReview: () => void; onRetry: () => void; onDelete: () => void;
}) {
  const isReady = bl.status === "ready_for_review";
  const isPublished = bl.status === "published" || bl.status === "indexed";
  const isError = bl.status === "error";

  return (
    <div className="flex items-center gap-2 justify-end whitespace-nowrap">
      {(isReady || isPublished) && bl.article_content && (
        <Button size="sm" variant="outline" onClick={onReview} className="shrink-0">
          <FileText className="w-3.5 h-3.5" /> {isReady ? "Publicar" : "Ver"}
        </Button>
      )}
      {isPublished && bl.published_url && (
        <a href={bl.published_url} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="text-success gap-1">
            <ExternalLink className="w-3 h-3" /> Abrir
          </Button>
        </a>
      )}
      {isError && (
        <Button size="sm" variant="outline" className="text-primary" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
      <button
        onClick={onDelete}
        className="p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
        aria-label="Excluir"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const config: Record<Status, { color: string; icon: any }> = {
    queued: { color: "bg-muted text-muted-foreground", icon: <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> },
    generating: { color: "bg-warning-light text-warning", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    ready_for_review: { color: "bg-info-light text-info", icon: <FileText className="w-3 h-3" /> },
    published: { color: "bg-success-light text-success", icon: <Check className="w-3 h-3" /> },
    indexed: { color: "bg-success-light text-success", icon: <Check className="w-3 h-3" /> },
    error: { color: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${c.color}`}>
      {c.icon}
      {STATUS_LABELS[status]}
    </span>
  );
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
