"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import { motion } from "motion/react";
import {
  Link as LinkIcon, ExternalLink, TrendingUp, Search,
  ArrowDown, ArrowUp, Globe, Shield, Loader2, Play, Check,
  Plus, Target, Layers, ArrowRight, Zap, Sparkles, FileText, Trash2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";

export default function BacklinksPage() {
  const router = useRouter();
  const { activeSiteId, loading: siteLoading } = useSite();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [totalBacklinks, setTotalBacklinks] = useState(0);
  const [createdBacklinks, setCreatedBacklinks] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<"dofollow" | "nofollow" | "all">("dofollow");
  const [sortBy, setSortBy] = useState<"ap" | "backlinks">("ap");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [anchorSearch, setAnchorSearch] = useState("");
  const [blPage, setBlPage] = useState(0);
  const BL_PER_PAGE = 20;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
    setBlPage(0);
  };

  useEffect(() => {
    if (siteLoading || !activeSiteId) { if (!siteLoading) setLoaded(true); return; }
    setLoaded(false);
    setBacklinks([]);

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("external_backlinks")
        .select("*")
        .eq("client_site_id", activeSiteId)
        .order("authority_points", { ascending: false });

      const items = data ?? [];
      setBacklinks(items);
      setTotalBacklinks(items.reduce((s: number, b: any) => s + (b.backlink_count ?? 1), 0));

      // Also load backlinks created by 8links
      const { data: created } = await supabase
        .from("backlinks")
        .select("*, network_sites(domain, niche)")
        .eq("client_site_id", activeSiteId)
        .order("created_at", { ascending: false });
      setCreatedBacklinks(created ?? []);

      setLoaded(true);
    }
    load();

    // Poll every 5s to check for status updates on processing backlinks
    const interval = setInterval(async () => {
      const supabase = createClient();
      const { data: updated } = await supabase
        .from("backlinks")
        .select("*, network_sites(domain, niche)")
        .eq("client_site_id", activeSiteId)
        .order("created_at", { ascending: false });
      if (updated) setCreatedBacklinks(updated);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSiteId, siteLoading]);

  // Filter + sort
  const filtered = backlinks
    .filter(bl => {
      if (filterType === "dofollow" && !bl.dofollow) return false;
      if (filterType === "nofollow" && bl.dofollow) return false;
      if (anchorSearch) {
        const s = anchorSearch.toLowerCase();
        if (!(bl.anchor ?? "").toLowerCase().includes(s) && !(bl.link_context ?? "").toLowerCase().includes(s) && !(bl.domain_from ?? "").toLowerCase().includes(s)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      if (sortBy === "ap") return (a.authority_points - b.authority_points) * mult;
      if (sortBy === "backlinks") return ((a.backlink_count ?? 1) - (b.backlink_count ?? 1)) * mult;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / BL_PER_PAGE);
  const pageItems = filtered.slice(blPage * BL_PER_PAGE, (blPage + 1) * BL_PER_PAGE);

  // Stats
  const dofollowCount = backlinks.filter(b => b.dofollow).length;
  const nofollowCount = backlinks.length - dofollowCount;
  const dofollowPct = backlinks.length > 0 ? Math.round(dofollowCount / backlinks.length * 100) : 0;
  const avgAP = backlinks.length > 0 ? Math.round(backlinks.reduce((s, b) => s + (b.authority_points ?? 0), 0) / backlinks.length) : 0;

  // Chart data
  const pieData = [
    { name: "Dofollow", value: dofollowCount, fill: "hsl(24, 100%, 55%)" },
    { name: "Nofollow", value: nofollowCount, fill: "hsl(20, 10%, 30%)" },
  ];
  const ranges = [
    { range: "0–10", count: backlinks.filter(b => b.authority_points < 10).length },
    { range: "10–30", count: backlinks.filter(b => b.authority_points >= 10 && b.authority_points < 30).length },
    { range: "30–50", count: backlinks.filter(b => b.authority_points >= 30 && b.authority_points < 50).length },
    { range: "50+", count: backlinks.filter(b => b.authority_points >= 50).length },
  ];
  const anchorMap = new Map<string, number>();
  backlinks.forEach(b => { const a = (b.anchor || "").trim(); if (a) anchorMap.set(a, (anchorMap.get(a) ?? 0) + 1); });
  const topAnchors = Array.from(anchorMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, count]) => ({ text, count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Backlinks</h1>
          <p className="text-sm text-muted-foreground mt-1">Sites que linkam para você</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Criar novo backlink
        </Button>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Backlinks" value={totalBacklinks} icon={LinkIcon} />
        <MetricCard label="Domínios Únicos" value={backlinks.length} icon={Globe} />
        <MetricCard label="Dofollow" value={dofollowPct} icon={TrendingUp} suffix="%" />
        <MetricCard label="DA Médio" value={avgAP} icon={Shield} />
      </motion.div>

      {/* Backlinks criados pelo 8links */}
      {createdBacklinks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Backlinks 8links
                </CardTitle>
                <div className="flex items-center gap-3">
                  {createdBacklinks.filter((b: any) => b.status === "queued").length > 0 && (
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={async () => {
                      const queued = createdBacklinks.filter((b: any) => b.status === "queued");
                      for (const bl of queued) {
                        toast(`⚙️ Processando "${bl.anchor_text}"...`, { duration: 3000 });
                        try {
                          await fetch("/api/admin/process-backlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ backlinkId: bl.id }) });
                        } catch {}
                      }
                      toast.success("Fila processada!");
                    }}>
                      <Play className="w-3 h-3" /> Processar fila ({createdBacklinks.filter((b: any) => b.status === "queued").length})
                    </Button>
                  )}
                  <span className="text-[10px] font-mono text-success">{createdBacklinks.filter((b: any) => b.status === "published").length} publicados</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Status</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Âncora</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">URL de destino</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Site parceiro</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono">Artigo</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider font-mono w-20">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdBacklinks.map((bl: any, i: number) => (
                      <tr key={bl.id || i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5">
                          {bl.status === "queued" && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 text-xs text-primary"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Na fila</span>
                              <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary/50 rounded-full w-[10%]" />
                              </div>
                            </div>
                          )}
                          {bl.status === "generating" && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 text-xs text-warning"><Loader2 className="w-3 h-3 animate-spin" /> Gerando...</span>
                              <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-warning rounded-full animate-pulse" style={{ width: "60%" }} />
                              </div>
                            </div>
                          )}
                          {bl.status === "published" && bl.published_url && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-success"><Check className="w-3.5 h-3.5" /> Publicado</span>
                          )}
                          {bl.status === "published" && !bl.published_url && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-primary"><FileText className="w-3.5 h-3.5" /> Pronto</span>
                          )}
                          {bl.status === "error" && (
                            <div>
                              <span className="inline-flex items-center gap-1.5 text-xs text-destructive">❌ Erro</span>
                              {bl.error_message && <p className="text-[9px] text-destructive/70 mt-0.5 max-w-[150px] truncate" title={bl.error_message}>{bl.error_message}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[150px]">
                          <span className="text-xs font-semibold break-words">{bl.anchor_text}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <a href={bl.target_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary truncate block">
                            {bl.target_url?.replace(/^https?:\/\//, "")}
                          </a>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs">{bl.network_sites?.domain ?? "Auto"}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          {bl.article_title ? (
                            <div>
                              <span className="text-xs truncate block text-muted-foreground">{bl.article_title}</span>
                              {bl.published_url && (
                                <a href={bl.published_url} target="_blank" rel="noopener noreferrer"
                                  className="text-[9px] font-mono text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                                  {bl.published_url.replace(/^https?:\/\//, "").slice(0, 35)}...
                                  <ExternalLink className="w-2 h-2" />
                                </a>
                              )}
                            </div>
                          ) : bl.status === "generating" ? (
                            <span className="text-[10px] text-warning animate-pulse">Escrevendo artigo...</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center gap-1.5">
                            {bl.status === "published" && bl.article_content && (
                              <>
                                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1"
                                  onClick={() => router.push(`/backlinks/${bl.id}/review`)}>
                                  {bl.published_url ? "Revisar" : "Revisar e publicar"}
                                </Button>
                                {bl.published_url && (
                                  <a href={bl.published_url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 text-success">
                                      <ExternalLink className="w-2.5 h-2.5" /> Ver
                                    </Button>
                                  </a>
                                )}
                              </>
                            )}
                            {bl.status === "error" && (
                              <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 text-primary" onClick={async () => {
                                const supabase = createClient();
                                await supabase.from("backlinks").update({ status: "queued", error_message: null }).eq("id", bl.id);
                                toast("Tentando novamente...");
                                try {
                                  await fetch("/api/admin/process-backlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ backlinkId: bl.id }) });
                                } catch {}
                              }}>
                                Tentar novamente
                              </Button>
                            )}
                            <button onClick={() => setDeleteConfirm(bl)}
                              className="text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer p-1"
                              title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!loaded ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : backlinks.length === 0 && createdBacklinks.length === 0 ? (
        <EmptyState icon={LinkIcon} title="Nenhum backlink encontrado" description="Os backlinks aparecerão aqui quando forem detectados ou criados pelo 8links." />
      ) : (
        <>

          {/* External backlinks header */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mt-2">Backlinks externos (sites que linkam pra você)</p>

          {/* Toolbar */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono shrink-0">
              {totalBacklinks.toLocaleString()} backlinks · {backlinks.length} domínios{filtered.length !== backlinks.length ? ` · ${filtered.length} filtrados` : ""}
            </p>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <div className="flex items-center rounded-lg border border-border overflow-hidden">
                {(["dofollow", "all", "nofollow"] as const).map(t => (
                  <button key={t} onClick={() => { setFilterType(t); setBlPage(0); }}
                    className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:text-foreground'}`}>
                    {t === "all" ? "Todos" : t}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="Buscar domínio ou âncora..." className="h-7 pl-7 text-xs w-48" value={anchorSearch} onChange={e => { setAnchorSearch(e.target.value); setBlPage(0); }} />
              </div>
            </div>
          </motion.div>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-right text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-14">
                        <button onClick={() => toggleSort("ap")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors" title="DA — força do domínio que linka pra você. Clique para ordenar.">
                          AP {sortBy === "ap" && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                        </button>
                      </th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono cursor-help" title="Site que está linkando para você">Domínio</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono cursor-help" title="Página exata que contém o link para seu site">Página de referência</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono cursor-help" title="Texto clicável do link que aponta para seu site">Âncora</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono cursor-help" title="Texto ao redor do link — mostra o contexto em que seu site é mencionado">Contexto</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono cursor-help" title="Página do seu site que recebe o link">URL de destino</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-14">
                        <button onClick={() => toggleSort("backlinks")} className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors" title="Quantidade de links deste domínio apontando para seu site. Clique para ordenar.">
                          Links {sortBy === "backlinks" && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
                        </button>
                      </th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground px-3 py-2.5 uppercase tracking-wider font-mono w-20 cursor-help" title="Dofollow passa autoridade para seu site. Nofollow não passa, mas ainda gera tráfego.">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((bl: any, i: number) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-primary-light/30 transition-colors">
                        <td className="px-3 py-2.5 text-right">
                          <span className={`font-mono text-xs font-bold ${bl.authority_points >= 50 ? 'text-success' : bl.authority_points >= 20 ? 'text-primary' : bl.authority_points > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {bl.authority_points > 0 ? bl.authority_points : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <a href={`https://${bl.domain_from}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:text-primary transition-colors">
                            {bl.domain_from}
                          </a>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          {bl.url_from ? (
                            <a href={bl.url_from} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate block" title={bl.url_from}>
                              {bl.url_from.replace(/^https?:\/\/[^/]+/, "") || "/"}
                            </a>
                          ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[160px]" title={bl.anchor || ""}>
                          <span className="text-xs font-medium truncate block">{bl.anchor || <span className="text-muted-foreground/50 italic">—</span>}</span>
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] cursor-help" title={bl.link_context || ""}>
                          {bl.link_context && bl.link_context !== bl.anchor ? (
                            <p className="text-[10px] text-muted-foreground/60 truncate">
                              {bl.text_pre && <span>{bl.text_pre}</span>}
                              <span className="font-semibold text-foreground">{bl.anchor}</span>
                              {bl.text_post && <span>{bl.text_post}</span>}
                            </p>
                          ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px]">
                          {bl.url_to ? (
                            <a href={bl.url_to} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors truncate block" title={bl.url_to}>
                              {bl.url_to.replace(/^https?:\/\/[^/]+/, "") || "/"}
                            </a>
                          ) : <span className="text-[10px] text-muted-foreground/50">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-mono text-xs font-bold text-primary">{bl.backlink_count ?? 1}</span>
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
          </motion.div>

          {/* Charts */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Dofollow vs Nofollow */}
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
                    <span className="text-[10px] text-muted-foreground font-mono">{dofollowPct}% dofollow</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authority distribution */}
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

            {/* Top anchors */}
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
                  <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* Article preview modal */}
      {processResult?.article && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setProcessResult(null)}>
          <div className="bg-[hsl(20,12%,6%)] border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <p className="text-sm font-semibold text-success">Artigo gerado com sucesso</p>
              </div>
              <button onClick={() => setProcessResult(null)} className="text-muted-foreground hover:text-foreground cursor-pointer text-lg">✕</button>
            </div>

            {/* Article content */}
            <div className="flex-1 overflow-y-auto px-8 py-6" dangerouslySetInnerHTML={{ __html: (() => {
              const lines = processResult.article.split('\n');
              let html = '';
              for (const line of lines) {
                const t = line.trim();
                if (t.startsWith('![')) {
                  const m = t.match(/!\[([^\]]*)\]\(([^)]+)\)/);
                  if (m) html += `<img src="${m[2]}" alt="${m[1]}" style="width:100%;border-radius:12px;margin:24px 0">`;
                  continue;
                }
                if (t.startsWith('*') && t.endsWith('*') && !t.startsWith('**')) {
                  html += `<p style="font-size:11px;color:#555;text-align:center;margin-top:-16px;margin-bottom:16px">${t.slice(1, -1)}</p>`;
                  continue;
                }
                if (t.startsWith('### ')) { html += `<h3 style="font-size:1.15em;color:#ddd;margin-top:1.8em;margin-bottom:0.5em;font-weight:700">${t.slice(4)}</h3>`; continue; }
                if (t.startsWith('## ')) {
                  const text = t.slice(3).replace(/\s*\(~?\d+\s*palavras?\)/gi, '');
                  html += `<h2 style="font-size:1.4em;color:#f97316;margin-top:2.5em;margin-bottom:0.6em;font-weight:800;padding-bottom:8px;border-bottom:1px solid rgba(249,115,22,0.2)">${text}</h2>`;
                  continue;
                }
                if (t.startsWith('# ')) {
                  html += `<h1 style="font-size:2em;color:#fff;margin-bottom:1.2em;font-weight:900;line-height:1.2">${t.slice(2)}</h1>`;
                  continue;
                }
                if (t.startsWith('- **')) {
                  html += `<li style="margin:6px 0;margin-left:20px;color:#b0b0b0;line-height:1.7">${t.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>')}</li>`;
                  continue;
                }
                if (t.startsWith('- ')) { html += `<li style="margin:4px 0;margin-left:20px;color:#b0b0b0">${t.slice(2)}</li>`; continue; }
                if (t === '') continue;
                html += `<p style="margin:0.8em 0;color:#b0b0b0;line-height:1.8;font-size:15px">${t.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff">$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#f97316;text-decoration:underline;font-weight:500">$1</a>')}</p>`;
              }
              return html;
            })() }} />
          </div>
        </div>
      )}

      {/* Create backlink modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar novo backlink</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {/* Backlink avulso */}
            <button onClick={() => { setCreateOpen(false); router.push("/keywords"); }}
              className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-bold mb-1">Backlink Avulso</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Escolha uma keyword que você já posiciona e envie um backlink pra melhorar a posição dela no Google.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-primary font-semibold">
                Ir para Keywords <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            {/* Campanha */}
            <div className="p-5 rounded-xl border border-border bg-card/50 text-left relative overflow-hidden opacity-60">
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="text-[9px]">Em breve</Badge>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold mb-1">Campanha de Backlinks</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Crie uma campanha automatizada que envia múltiplos backlinks pra várias páginas ao longo do tempo.
              </p>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-semibold">
                <Sparkles className="w-3 h-3" /> Autopilot
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Excluir backlink
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Essa ação é <span className="text-destructive font-bold">irreversível</span>. O artigo será removido do site parceiro e o backlink deixará de existir.
            </p>
            {deleteConfirm && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
                <p><span className="text-muted-foreground">Âncora:</span> <span className="font-semibold">{deleteConfirm.anchor_text}</span></p>
                <p><span className="text-muted-foreground">Site:</span> {deleteConfirm.network_sites?.domain ?? "—"}</p>
                {deleteConfirm.published_url && <p><span className="text-muted-foreground">URL:</span> <span className="font-mono">{deleteConfirm.published_url}</span></p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              if (!deleteConfirm) return;
              setDeleting(true);
              const supabase = createClient();

              // Remove from network_posts (external Supabase) if published
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

              // Delete from backlinks table
              await supabase.from("backlinks").delete().eq("id", deleteConfirm.id);
              setCreatedBacklinks(prev => prev.filter(b => b.id !== deleteConfirm.id));
              setDeleteConfirm(null);
              setDeleting(false);
              toast.success("Backlink excluído permanentemente");
            }}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
