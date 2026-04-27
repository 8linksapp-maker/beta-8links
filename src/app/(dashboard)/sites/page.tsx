"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import {
  Globe, Plus, Search, ExternalLink, TrendingUp,
  ArrowRight, Trash2, Zap, LinkIcon, Target, MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

export default function SitesPage() {
  const router = useRouter();
  const { sites: ctxSites, activeSiteId, setActiveSiteId, reload } = useSite();
  const [enrichedSites, setEnrichedSites] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (ctxSites.length === 0) { setLoaded(true); return; }

    async function enrich() {
      const supabase = createClient();

      const enriched = await Promise.all(ctxSites.map(async (s: any) => {
        const [kwRes, blRes] = await Promise.all([
          supabase.from("keywords").select("id", { count: "exact", head: true }).eq("client_site_id", s.id),
          supabase.from("external_backlinks").select("backlink_count").eq("client_site_id", s.id),
        ]);

        const totalBacklinks = (blRes.data ?? []).reduce((sum: number, r: any) => sum + (r.backlink_count ?? 1), 0);

        return {
          id: s.id,
          url: s.url?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "",
          fullUrl: s.url,
          niche: s.niche_primary ?? "—",
          da: s.da_current ?? 0,
          autopilot: s.autopilot_active ?? true,
          backlinks: totalBacklinks,
          keywords: kwRes.count ?? 0,
          hasGoogle: !!s.google_refresh_token,
          hasGitHub: !!s.github_token,
          hasWP: !!s.wp_url,
        };
      }));

      setEnrichedSites(enriched);
      setLoaded(true);
    }
    enrich();
  }, [ctxSites]);

  const filtered = searchQuery
    ? enrichedSites.filter(s => s.url.includes(searchQuery.toLowerCase()) || s.niche.toLowerCase().includes(searchQuery.toLowerCase()))
    : enrichedSites;

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Meus Sites</h1>
          <p className="page-description">Gerencie seus domínios e acompanhe a evolução.</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => router.push("/sites/new")}>
          <Plus className="w-4 h-4" /> Adicionar Site
        </Button>
      </motion.div>

      {/* Search */}
      {enrichedSites.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Buscar por domínio ou nicho..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((site, index) => (
            <motion.div key={site.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}>
              <Card className={`card-interactive relative overflow-hidden cursor-pointer ${activeSiteId === site.id ? 'ring-1 ring-primary/30' : ''}`}
                onClick={() => handleSelectSite(site.id)}>
                <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

                <CardHeader className="pb-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary-light ring-1 ring-primary/20 flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-2">
                          {site.url}
                          {activeSiteId === site.id && <Badge variant="default" className="text-[9px] px-1.5">ativo</Badge>}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px]">{site.niche}</Badge>
                          {site.hasGoogle && <span className="text-[9px] text-muted-foreground">Google</span>}
                          {site.hasGitHub && <span className="text-[9px] text-muted-foreground">GitHub</span>}
                          {site.hasWP && <span className="text-[9px] text-muted-foreground">WP</span>}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(site.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 relative">
                  {/* KPIs row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">DA</p>
                      </div>
                      <p className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight">
                        <NumberTicker value={site.da} />
                      </p>
                    </div>
                    <div className="text-center p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <LinkIcon className="w-3 h-3 text-primary" />
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Backlinks</p>
                      </div>
                      <p className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight">
                        <NumberTicker value={site.backlinks} />
                      </p>
                    </div>
                    <div className="text-center p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Target className="w-3 h-3 text-primary" />
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Keywords</p>
                      </div>
                      <p className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight">
                        <NumberTicker value={site.keywords} />
                      </p>
                    </div>
                  </div>

                  {/* Autopilot */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                    <Zap className={`w-3.5 h-3.5 ${site.autopilot ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold">Autopilot</span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className={`h-2 w-2 rounded-full ${site.autopilot ? "bg-success dot-pulse" : "bg-warning"}`} />
                      <span className={`text-xs font-mono font-semibold ${site.autopilot ? "text-success" : "text-warning"}`}>
                        {site.autopilot ? "Ativo" : "Pausado"}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    {activeSiteId === site.id ? "Abrir dashboard" : "Selecionar e abrir"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

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
