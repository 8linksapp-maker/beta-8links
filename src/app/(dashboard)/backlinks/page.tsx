"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Link as LinkIcon, ExternalLink, Loader2, Play, Check,
  Plus, FileText, Trash2, AlertTriangle, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";
import { humanizeError } from "@/lib/utils/error-messages";

type Backlink = {
  id: string;
  anchor_text: string;
  target_url: string;
  status: "queued" | "generating" | "ready_for_review" | "published" | "indexed" | "error";
  error_message?: string | null;
  article_title?: string | null;
  article_content?: string | null;
  published_url?: string | null;
  created_at: string;
  network_sites?: { domain: string; niche: string } | null;
};

const STATUS_LABELS: Record<Backlink["status"], string> = {
  queued: "Na fila",
  generating: "Gerando",
  ready_for_review: "Pronto para revisar",
  published: "Publicado",
  indexed: "Indexado pelo Google",
  error: "Erro",
};

export default function BacklinksPage() {
  const router = useRouter();
  const { activeSiteId, loading: siteLoading } = useSite();
  const [items, setItems] = useState<Backlink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Backlink | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [processingFila, setProcessingFila] = useState(false);

  useEffect(() => {
    if (siteLoading || !activeSiteId) {
      if (!siteLoading) setLoaded(true);
      return;
    }

    let cancelled = false;
    async function load() {
      const supabase = createClient();
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

    // Poll every 5s pra status updates
    const interval = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeSiteId, siteLoading]);

  const queuedCount = items.filter(b => b.status === "queued").length;
  const publishedCount = items.filter(b => b.status === "published" || b.status === "indexed").length;

  const processQueue = async () => {
    const queued = items.filter(b => b.status === "queued");
    if (queued.length === 0) return;
    setProcessingFila(true);
    toast(`Processando ${queued.length} backlink${queued.length > 1 ? "s" : ""}...`);

    const CONCURRENCY = 3;
    let ok = 0;
    const errors: { anchor: string; reason: string }[] = [];

    async function processOne(bl: Backlink) {
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
        } else ok++;
      } catch (e) {
        errors.push({ anchor: bl.anchor_text, reason: humanizeError(e).user });
      }
    }

    for (let i = 0; i < queued.length; i += CONCURRENCY) {
      await Promise.all(queued.slice(i, i + CONCURRENCY).map(processOne));
    }

    if (errors.length === 0) toast.success(`${ok} backlink${ok > 1 ? "s" : ""} concluído${ok > 1 ? "s" : ""}`);
    else if (ok === 0) toast.error(`Não foi possível processar. ${errors[0].reason}`);
    else toast.warning(`${ok} concluído(s), ${errors.length} com problema. Veja na lista.`);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-[family-name:var(--font-display)] tracking-tight">Backlinks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Os backlinks que você criou pra subir seu site no Google.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <Button
              variant="outline"
              onClick={processQueue}
              disabled={processingFila}
              className="gap-2"
            >
              {processingFila ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Processar fila ({queuedCount})
            </Button>
          )}
          <Link href="/palavras">
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Criar backlink
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Empty state */}
      {items.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">Nenhum backlink ainda</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Backlinks são links de outros sites apontando pro seu — quanto mais você tem, mais o Google confia.
                Comece criando o primeiro a partir de uma palavra do seu plano.
              </p>
              <Link href="/palavras">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" /> Criar primeiro backlink
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {publishedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="text-success font-semibold">{publishedCount}</span> publicado{publishedCount > 1 ? "s" : ""} · {items.length} no total
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-2"
          >
            {items.map((bl) => (
              <BacklinkRow
                key={bl.id}
                bl={bl}
                onReview={() => router.push(`/backlinks/${bl.id}/review`)}
                onRetry={() => retry(bl)}
                onDelete={() => setDeleteConfirm(bl)}
              />
            ))}
          </motion.div>
        </>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Excluir backlink
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Essa ação é <span className="text-destructive font-bold">irreversível</span>. Se o backlink já está publicado, o artigo também será removido.
            </p>
            {deleteConfirm && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
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

function BacklinkRow({ bl, onReview, onRetry, onDelete }: {
  bl: Backlink;
  onReview: () => void;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const isProcessing = bl.status === "queued" || bl.status === "generating";
  const isReady = bl.status === "ready_for_review";
  const isPublished = bl.status === "published" || bl.status === "indexed";
  const isError = bl.status === "error";

  return (
    <Card className="card-interactive">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status badge */}
          <div className="shrink-0">
            <StatusBadge status={bl.status} />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{bl.anchor_text}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono flex-wrap">
              <span className="truncate max-w-[200px]">→ {bl.target_url.replace(/^https?:\/\//, "")}</span>
              {bl.network_sites?.domain && <><span>·</span><span>em {bl.network_sites.domain}</span></>}
              <span>·</span>
              <span>{new Date(bl.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            </div>
            {isError && bl.error_message && (
              <p className="text-[11px] text-destructive mt-1.5">{bl.error_message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(isReady || isPublished) && bl.article_content && (
              <Button size="sm" variant="outline" onClick={onReview}>
                <FileText className="w-3.5 h-3.5" /> {isReady ? "Revisar" : "Ver"}
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
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Backlink["status"] }) {
  const config: Record<Backlink["status"], { color: string; icon: any }> = {
    queued: { color: "bg-muted text-muted-foreground", icon: <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> },
    generating: { color: "bg-warning-light text-warning", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    ready_for_review: { color: "bg-info-light text-info", icon: <FileText className="w-3 h-3" /> },
    published: { color: "bg-success-light text-success", icon: <Check className="w-3 h-3" /> },
    indexed: { color: "bg-success-light text-success", icon: <Check className="w-3 h-3" /> },
    error: { color: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${c.color}`}>
      {c.icon}
      {STATUS_LABELS[status]}
    </span>
  );
}
