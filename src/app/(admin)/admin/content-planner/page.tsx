"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, Check, Loader2, Search, FileText, ArrowRight,
  Play, ChevronDown, ChevronRight, X, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SiteStatus {
  id: string;
  domain: string;
  niche: string;
  keywords: number;
  status: "done" | "partial" | "pending";
}

interface PlannedKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  selected: boolean;
}

export default function ContentPlannerPage() {
  const [sites, setSites] = useState<SiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Planning state
  const [planningSiteId, setPlanningSiteId] = useState<string | null>(null);
  const [planningSiteDomain, setPlanningSiteDomain] = useState("");
  const [planningLoading, setPlanningLoading] = useState(false);
  const [plannedKeywords, setPlannedKeywords] = useState<PlannedKeyword[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  // Batch planning state
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentDomain: "", errors: 0, done: [] as string[] });

  // Expanded site
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState(0);
  const [siteKeywords, setSiteKeywords] = useState<any[]>([]);

  // Load all sites with keyword counts
  const loadSites = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: allSites } = await supabase.from("network_sites").select("id, domain, niche").eq("status", "active").order("domain");
    if (!allSites) { setLoading(false); return; }

    const statuses: SiteStatus[] = [];
    for (const site of allSites) {
      const { count } = await supabase.from("content_calendar").select("id", { count: "exact", head: true }).eq("network_site_id", site.id);
      const kwCount = count ?? 0;
      statuses.push({
        id: site.id,
        domain: site.domain,
        niche: site.niche,
        keywords: kwCount,
        status: kwCount >= 100 ? "done" : kwCount > 0 ? "partial" : "pending",
      });
    }
    setSites(statuses);
    setLoading(false);
  };

  useEffect(() => { loadSites(); }, []);

  // Generate plan for a site
  const generatePlan = async (siteId: string, domain: string) => {
    setPlanningSiteId(siteId);
    setPlanningSiteDomain(domain);
    setPlanningLoading(true);
    setPlannedKeywords([]);

    try {
      const res = await fetch("/api/admin/plan-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, targetKeywords: 200 }),
      });
      const data = await res.json();
      if (data.keywords?.length) {
        setPlannedKeywords(data.keywords.map((k: any) => ({ ...k, selected: true })));
      } else {
        toast.error(data.error || "Nenhuma keyword encontrada");
      }
    } catch {
      toast.error("Erro ao gerar planejamento");
    }
    setPlanningLoading(false);
  };

  // Save approved plan to DB
  const savePlan = async () => {
    if (!planningSiteId) return;
    setSavingPlan(true);

    const selected = plannedKeywords.filter(k => k.selected);
    const supabase = createClient();

    // Delete existing
    await supabase.from("content_calendar").delete().eq("network_site_id", planningSiteId);

    // Insert in batches
    const rows = selected.map(k => ({
      network_site_id: planningSiteId,
      keyword: k.keyword,
      volume: k.volume,
      difficulty: k.difficulty,
      status: "planned" as const,
    }));

    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      await supabase.from("content_calendar").insert(batch);
    }

    toast.success(`${selected.length} keywords salvas para ${planningSiteDomain}`);
    setPlanningSiteId(null);
    setPlannedKeywords([]);
    setSavingPlan(false);
    loadSites(); // Refresh
  };

  // Batch plan all pending sites
  const runBatchPlanning = async () => {
    const pending = sites.filter(s => s.status === "pending");
    if (pending.length === 0) { toast("Todos os sites já estão planejados!"); return; }

    setBatchRunning(true);
    setBatchProgress({ current: 0, total: pending.length, currentDomain: "", errors: 0, done: [] });

    for (let i = 0; i < pending.length; i++) {
      const site = pending[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1, currentDomain: site.domain }));

      try {
        // Generate plan
        const res = await fetch("/api/admin/plan-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: site.domain, targetKeywords: 200 }),
        });
        const data = await res.json();

        if (data.keywords?.length) {
          // Auto-save to DB
          const supabase = createClient();
          await supabase.from("content_calendar").delete().eq("network_site_id", site.id);

          const rows = data.keywords.map((k: any) => ({
            network_site_id: site.id,
            keyword: k.keyword,
            volume: k.volume,
            difficulty: k.difficulty,
            status: "planned",
          }));

          for (let j = 0; j < rows.length; j += 50) {
            await supabase.from("content_calendar").insert(rows.slice(j, j + 50));
          }

          setBatchProgress(prev => ({ ...prev, done: [...prev.done, `✅ ${site.domain} — ${data.keywords.length} keywords`] }));
        } else {
          setBatchProgress(prev => ({ ...prev, errors: prev.errors + 1, done: [...prev.done, `❌ ${site.domain} — ${data.error || "sem keywords"}`] }));
        }
      } catch {
        setBatchProgress(prev => ({ ...prev, errors: prev.errors + 1, done: [...prev.done, `❌ ${site.domain} — erro`] }));
      }

      // Update site list after each site
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, keywords: -1, status: "done" as const } : s));
    }

    setBatchRunning(false);
    toast.success("Planejamento completo!");
    loadSites(); // Final refresh
  };

  // Load keywords for expanded site
  const loadSiteKeywords = async (siteId: string) => {
    if (expandedSite === siteId) { setExpandedSite(null); return; }
    setExpandedSite(siteId);
    setExpandedPage(0);
    const supabase = createClient();
    const { data } = await supabase.from("content_calendar").select("keyword, volume, difficulty, status").eq("network_site_id", siteId).order("volume", { ascending: false });
    setSiteKeywords(data ?? []);
  };

  // Download plan as HTML
  const downloadPlan = (domain: string, keywords: any[]) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Planejamento - ${domain}</title><style>body{font-family:system-ui;max-width:1000px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#e0e0e0}h1{color:#f97316}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#1a1a1a;color:#f97316;text-align:left;padding:10px;font-size:11px;text-transform:uppercase}td{padding:8px 10px;border-bottom:1px solid #1a1a1a;font-size:13px}.vol{font-weight:bold;color:#f97316;text-align:right}.dif{text-align:center}</style></head><body><h1>Planejamento — ${domain}</h1><p>${keywords.length} keywords | ${new Date().toLocaleDateString("pt-BR")}</p><table><thead><tr><th>#</th><th>Keyword</th><th style="text-align:right">Volume</th><th style="text-align:center">Dif</th></tr></thead><tbody>${keywords.map((k, i) => `<tr><td>${i + 1}</td><td>${k.keyword}</td><td class="vol">${k.volume?.toLocaleString()}</td><td class="dif">${k.difficulty}</td></tr>`).join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `planejamento_${domain.replace(/\./g, "_")}.html`;
    a.click();
  };

  // Filter
  const filtered = sites.filter(s => !search || s.domain.includes(search.toLowerCase()) || s.niche.toLowerCase().includes(search.toLowerCase()));
  const totalDone = sites.filter(s => s.status === "done").length;
  const totalPending = sites.filter(s => s.status === "pending").length;
  const totalKeywords = sites.reduce((s, site) => s + site.keywords, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Planejamento de Conteúdo</h1>
        <p className="text-sm text-muted-foreground mt-1">Gere e aprove keywords pra cada site da rede</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{sites.length}</p><p className="text-[10px] text-muted-foreground uppercase font-mono">Total sites</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-success">{totalDone}</p><p className="text-[10px] text-muted-foreground uppercase font-mono">Planejados</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-warning">{totalPending}</p><p className="text-[10px] text-muted-foreground uppercase font-mono">Pendentes</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{totalKeywords.toLocaleString()}</p><p className="text-[10px] text-muted-foreground uppercase font-mono">Keywords total</p></CardContent></Card>
      </motion.div>

      {/* Search + batch button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar domínio ou nicho..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button onClick={runBatchPlanning} disabled={batchRunning || totalPending === 0} className="gap-2 shrink-0">
          {batchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {batchRunning ? `Planejando ${batchProgress.current}/${batchProgress.total}...` : `Planejar todos (${totalPending} pendentes)`}
        </Button>
      </div>

      {/* Batch progress */}
      {batchRunning && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Planejando: <span className="text-primary">{batchProgress.currentDomain}</span></p>
              <Badge variant="outline" className="font-mono text-xs">{batchProgress.current}/{batchProgress.total}</Badge>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
            </div>
            {batchProgress.done.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {batchProgress.done.map((log, i) => (
                  <p key={i} className="text-[11px] font-mono text-muted-foreground">{log}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sites list */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(site => (
            <Card key={site.id} className={`${planningSiteId === site.id ? "ring-1 ring-primary" : ""}`}>
              <CardContent className="p-0">
                {/* Site row */}
                <div className="flex items-center gap-4 px-4 py-3">
                  <button onClick={() => loadSiteKeywords(site.id)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                    {expandedSite === site.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold truncate">{site.domain}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{site.niche}</Badge>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground">{site.keywords} kw</span>

                    {site.status === "done" && <Badge className="text-[10px] bg-success/15 text-success border-success/30">✓ Planejado</Badge>}
                    {site.status === "partial" && <Badge className="text-[10px] bg-warning/15 text-warning border-warning/30">Parcial</Badge>}
                    {site.status === "pending" && <Badge variant="outline" className="text-[10px]">Pendente</Badge>}

                    {site.keywords > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => {
                        const supabase = createClient();
                        supabase.from("content_calendar").select("keyword, volume, difficulty").eq("network_site_id", site.id).order("volume", { ascending: false }).then(({ data }) => {
                          if (data) downloadPlan(site.domain, data);
                        });
                      }}>
                        <Download className="w-3 h-3" />
                      </Button>
                    )}

                    <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => generatePlan(site.id, site.domain)} disabled={planningLoading && planningSiteId === site.id}>
                      {planningLoading && planningSiteId === site.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      {site.keywords > 0 ? "Replanejar" : "Planejar"}
                    </Button>
                  </div>
                </div>

                {/* Expanded: show existing keywords with pagination */}
                {expandedSite === site.id && siteKeywords.length > 0 && (() => {
                  const kwPerPage = 30;
                  const kwTotalPages = Math.ceil(siteKeywords.length / kwPerPage);
                  const kwCurrentPage = expandedPage;
                  const kwPageItems = siteKeywords.slice(kwCurrentPage * kwPerPage, (kwCurrentPage + 1) * kwPerPage);

                  return (
                  <div className="px-4 pb-3 border-t border-border">
                    <div className="mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1 font-mono">#</th>
                            <th className="text-left py-1 font-mono">Keyword</th>
                            <th className="text-right py-1 font-mono">Volume</th>
                            <th className="text-center py-1 font-mono">Dif</th>
                            <th className="text-center py-1 font-mono">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kwPageItems.map((kw, i) => (
                            <tr key={i} className="border-t border-border/30">
                              <td className="py-1 text-muted-foreground">{kwCurrentPage * kwPerPage + i + 1}</td>
                              <td className="py-1">{kw.keyword}</td>
                              <td className="py-1 text-right font-mono text-primary">{kw.volume?.toLocaleString()}</td>
                              <td className="py-1 text-center font-mono">{kw.difficulty}</td>
                              <td className="py-1 text-center"><Badge variant="outline" className="text-[8px]">{kw.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {kwTotalPages > 1 && (
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-[10px] text-muted-foreground font-mono">{kwCurrentPage * kwPerPage + 1}–{Math.min((kwCurrentPage + 1) * kwPerPage, siteKeywords.length)} de {siteKeywords.length}</p>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={kwCurrentPage === 0} onClick={() => setExpandedPage(p => p - 1)}>Anterior</Button>
                            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2" disabled={kwCurrentPage >= kwTotalPages - 1} onClick={() => setExpandedPage(p => p + 1)}>Próximo</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Planning modal/panel */}
      {planningSiteId && plannedKeywords.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPlanningSiteId(null)}>
          <div className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold">{planningSiteDomain}</h2>
                <p className="text-xs text-muted-foreground">{plannedKeywords.filter(k => k.selected).length} de {plannedKeywords.length} keywords selecionadas</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setPlannedKeywords(prev => prev.map(k => ({ ...k, selected: true })))}>Selecionar todas</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setPlannedKeywords(prev => prev.map(k => ({ ...k, selected: false })))}>Desmarcar todas</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPlanningSiteId(null)}><X className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Keywords list */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-[10px] text-muted-foreground uppercase font-mono">
                    <th className="py-2 w-8"></th>
                    <th className="py-2 text-left">#</th>
                    <th className="py-2 text-left">Keyword</th>
                    <th className="py-2 text-right">Volume</th>
                    <th className="py-2 text-center">Dificuldade</th>
                    <th className="py-2 text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedKeywords.map((kw, i) => (
                    <tr key={i} className={`border-b border-border/30 cursor-pointer transition-colors ${kw.selected ? "hover:bg-primary-light/30" : "opacity-40 hover:opacity-70"}`}
                      onClick={() => setPlannedKeywords(prev => prev.map((k, j) => j === i ? { ...k, selected: !k.selected } : k))}>
                      <td className="py-2">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${kw.selected ? "bg-primary border-primary" : "border-border-strong"}`}>
                          {kw.selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                        </div>
                      </td>
                      <td className="py-2 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="py-2 font-medium">{kw.keyword}</td>
                      <td className="py-2 text-right font-mono text-primary font-bold">{kw.volume?.toLocaleString()}</td>
                      <td className="py-2 text-center font-mono">{kw.difficulty}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">{Math.round(kw.volume / (kw.difficulty + 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
              <div className="text-xs text-muted-foreground">
                {plannedKeywords.filter(k => k.selected).length} keywords selecionadas ·
                Volume total: {plannedKeywords.filter(k => k.selected).reduce((s, k) => s + k.volume, 0).toLocaleString()}/mês
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => downloadPlan(planningSiteDomain, plannedKeywords.filter(k => k.selected))}>
                  <Download className="w-4 h-4" /> Baixar HTML
                </Button>
                <Button onClick={savePlan} disabled={savingPlan} className="gap-2">
                  {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Aprovar e salvar ({plannedKeywords.filter(k => k.selected).length} keywords)
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Planning loading overlay */}
      {planningLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm font-semibold">Gerando planejamento para {planningSiteDomain}...</p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar 2-3 minutos</p>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
