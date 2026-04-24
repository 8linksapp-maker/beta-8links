"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Globe,
  Search,
  Plus,
  Pencil,
  Pause,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const SITES = [
  { id: 1, domain: "portalrural.com.br", niche: "Agronegocio", da: 42, type: "Blog", status: "active" as const },
  { id: 2, domain: "vidadigital.com", niche: "Marketing Digital", da: 55, type: "Portal", status: "active" as const },
  { id: 3, domain: "techblog.com.br", niche: "Tecnologia", da: 48, type: "Blog", status: "active" as const },
  { id: 4, domain: "saudeanimal.vet.br", niche: "Veterinaria", da: 38, type: "Blog", status: "paused" as const },
  { id: 5, domain: "viagemdecampo.com.br", niche: "Turismo", da: 35, type: "Portal", status: "active" as const },
  { id: 6, domain: "agritech.news", niche: "AgTech", da: 51, type: "Portal", status: "active" as const },
  { id: 7, domain: "gestaorural.com.br", niche: "Gestao", da: 40, type: "Blog", status: "active" as const },
  { id: 8, domain: "equinosbrasil.com.br", niche: "Equinos", da: 45, type: "Blog", status: "active" as const },
  { id: 9, domain: "fitnessbr.com", niche: "Saude", da: 37, type: "Portal", status: "paused" as const },
  { id: 10, domain: "educaonline.com.br", niche: "Educacao", da: 52, type: "Blog", status: "active" as const },
];

export default function NetworkPage() {
  const [search, setSearch] = useState("");
  const [dbData, setDbData] = useState<any[]>([]);

  // Add Site state
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [siteDomain, setSiteDomain] = useState("");
  const [siteNiche, setSiteNiche] = useState("");
  const [siteDa, setSiteDa] = useState("");
  const [siteType, setSiteType] = useState("blog");
  const [addingSite, setAddingSite] = useState(false);

  // Delete Site state
  const [deleteSiteOpen, setDeleteSiteOpen] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState<string | number | null>(null);
  const [deletingSiteDomain, setDeletingSiteDomain] = useState("");
  const [deletingSite, setDeletingSite] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("network_sites").select("*").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDbData(data.map((d: any) => ({
          id: d.id,
          domain: d.domain || "",
          niche: d.niche || "",
          da: d.da ?? 0,
          type: d.type || "Blog",
          status: d.status || "active",
        })));
      }
    }
    load();
  }, []);

  async function handleAddSite() {
    if (!siteDomain) {
      toast.error("Dominio e obrigatorio");
      return;
    }
    setAddingSite(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("network_sites")
        .insert({ domain: siteDomain, niche: siteNiche, da: Number(siteDa) || 0, site_type: siteType, status: "active" })
        .select()
        .single();
      if (error) throw error;

      setDbData(prev => [{
        id: data.id,
        domain: siteDomain,
        niche: siteNiche,
        da: Number(siteDa) || 0,
        type: siteType.charAt(0).toUpperCase() + siteType.slice(1),
        status: "active",
      }, ...prev]);

      toast.success("Site adicionado com sucesso!");
      setAddSiteOpen(false);
      setSiteDomain(""); setSiteNiche(""); setSiteDa(""); setSiteType("blog");
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar site");
    } finally {
      setAddingSite(false);
    }
  }

  async function handleDeleteSite() {
    if (!deletingSiteId) return;
    setDeletingSite(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("network_sites").delete().eq("id", deletingSiteId);
      if (error) throw error;
      setDbData(prev => prev.filter(s => s.id !== deletingSiteId));
      toast.success("Site removido com sucesso!");
      setDeleteSiteOpen(false);
      setDeletingSiteId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover site");
    } finally {
      setDeletingSite(false);
    }
  }

  const sites = dbData.length > 0 ? dbData : SITES;

  const filtered = sites.filter((s) =>
    s.domain.toLowerCase().includes(search.toLowerCase()) ||
    s.niche.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header flex items-center justify-between"
      >
        <div>
          <h1 className="page-title">Rede de Sites</h1>
          <p className="page-description">Gerencie os sites parceiros da rede de backlinks</p>
        </div>
        <Button onClick={() => setAddSiteOpen(true)}>
          <Plus className="w-4 h-4" />
          Adicionar Site
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por dominio ou nicho..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dominio</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nicho</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">DA</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((site, i) => (
                    <motion.tr
                      key={site.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-mono font-semibold">{site.domain}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">{site.niche}</td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className="font-mono">AP {site.da}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={site.type === "Portal" ? "info" : "secondary"}>{site.type}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <StatusTag status={site.status} label={site.status === "active" ? "Ativo" : "Pausado"} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Pause className="w-4 h-4" /></Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingSiteId(site.id);
                              setDeletingSiteDomain(site.domain);
                              setDeleteSiteOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Site Dialog */}
      <Dialog open={addSiteOpen} onOpenChange={setAddSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Site</DialogTitle>
            <DialogDescription>Preencha os dados do novo site da rede</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Dominio</label>
              <Input value={siteDomain} onChange={(e) => setSiteDomain(e.target.value)} placeholder="meusite.com.br" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nicho</label>
              <Input value={siteNiche} onChange={(e) => setSiteNiche(e.target.value)} placeholder="Ex: Marketing Digital" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">DA</label>
              <Input type="number" value={siteDa} onChange={(e) => setSiteDa(e.target.value)} placeholder="40" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Tipo</label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="blog">Blog</option>
                <option value="portal">Portal</option>
                <option value="magazine">Magazine</option>
                <option value="news">News</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSiteOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddSite} disabled={addingSite}>
              {addingSite ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Site Dialog */}
      <Dialog open={deleteSiteOpen} onOpenChange={setDeleteSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Site</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deletingSiteDomain}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSiteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteSite} disabled={deletingSite}>
              {deletingSite ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
