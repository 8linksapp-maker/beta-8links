"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  DollarSign, Users, TrendingUp, Plus, ArrowRight,
  ExternalLink, FileText, MoreHorizontal, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const mockClients = [
  { name: "Padaria Silva", email: "contato@padariasilva.com", site: "padariasilva.com.br", score: 45, da: 18, charge: 400, backlinks: 32, status: "active" as const, phase: "Crescendo" },
  { name: "Dr. João Clínica", email: "joao@clinicajoao.com", site: "clinicajoao.com.br", score: 62, da: 28, charge: 500, backlinks: 58, status: "active" as const, phase: "Crescendo" },
  { name: "Loja Fashion", email: "loja@fashionbr.com", site: "fashionbr.com", score: 28, da: 12, charge: 350, backlinks: 15, status: "active" as const, phase: "Plantando" },
  { name: "Pet Shop Rex", email: "rex@petshop.com", site: "petshoprex.com.br", score: 71, da: 35, charge: 500, backlinks: 85, status: "active" as const, phase: "Colhendo" },
  { name: "Mecânica Top", email: "top@mecanica.com", site: "mecanicatop.com", score: 15, da: 8, charge: 300, backlinks: 8, status: "active" as const, phase: "Plantando" },
];

export default function CRMPage() {
  const [dbClients, setDbClients] = useState<any[]>([]);

  // Add Client state
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientSite, setClientSite] = useState("");
  const [clientCharge, setClientCharge] = useState("");
  const [addingClient, setAddingClient] = useState(false);

  // Delete Client state
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingClientName, setDeletingClientName] = useState("");
  const [deletingClient, setDeletingClient] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("reseller_clients").select("*, client_sites(url, da_current, seo_score, phase)").eq("reseller_id", user.id);
      if (data && data.length > 0) {
        setDbClients(data.map(c => ({
          name: c.name, email: c.email, site: c.client_sites?.url ?? "", score: c.client_sites?.seo_score ?? 0,
          da: c.client_sites?.da_current ?? 0, charge: Number(c.monthly_charge), backlinks: 0,
          status: "active", phase: c.client_sites?.phase === "harvesting" ? "Colhendo" : c.client_sites?.phase === "growing" ? "Crescendo" : "Plantando",
        })));
      }
    }
    load();
  }, []);

  async function handleAddClient() {
    if (!clientName || !clientSite) {
      toast.error("Nome e Site URL são obrigatórios");
      return;
    }
    setAddingClient(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Usuário não autenticado"); return; }

      const { data: site, error: siteError } = await supabase
        .from("client_sites")
        .insert({ user_id: user.id, url: clientSite })
        .select()
        .single();
      if (siteError) throw siteError;

      const { data: client, error: clientError } = await supabase
        .from("reseller_clients")
        .insert({
          reseller_id: user.id,
          name: clientName,
          email: clientEmail,
          client_site_id: site.id,
          monthly_charge: Number(clientCharge) || 0,
        })
        .select()
        .single();
      if (clientError) throw clientError;

      setDbClients(prev => [...prev, {
        id: client.id,
        name: clientName,
        email: clientEmail,
        site: clientSite,
        score: 0,
        da: 0,
        charge: Number(clientCharge) || 0,
        backlinks: 0,
        status: "active",
        phase: "Plantando",
      }]);

      toast.success("Cliente adicionado com sucesso!");
      setAddClientOpen(false);
      setClientName(""); setClientEmail(""); setClientSite(""); setClientCharge("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar cliente");
    } finally {
      setAddingClient(false);
    }
  }

  async function handleDeleteClient() {
    if (!deletingClientId) return;
    setDeletingClient(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("reseller_clients").delete().eq("id", deletingClientId);
      if (error) throw error;
      setDbClients(prev => prev.filter(c => c.id !== deletingClientId));
      toast.success("Cliente removido com sucesso!");
      setDeleteClientOpen(false);
      setDeletingClientId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover cliente");
    } finally {
      setDeletingClient(false);
    }
  }

  const clients = dbClients.length > 0 ? dbClients : mockClients;
  const totalReceita = clients.reduce((acc: number, c: any) => acc + c.charge, 0);
  const custoPlano = 597;
  const lucro = totalReceita - custoPlano;
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">CRM Revenda</h1>
          <p className="page-description">Gerencie seus clientes e acompanhe sua receita</p>
        </div>
        <Button onClick={() => setAddClientOpen(true)}><Plus className="w-4 h-4" /> Adicionar Cliente</Button>
      </motion.div>

      {/* Revenue cards */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="card-beam rounded-xl border bg-card p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Clientes Ativos</p>
              <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight"><NumberTicker value={clients.length} /></p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Receita Mensal</p>
              <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-gradient">
                R$ <NumberTicker value={totalReceita} />
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Custo 8links</p>
              <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-muted-foreground">
                R$ {custoPlano}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-2">Lucro Líquido</p>
              <p className="text-3xl font-black font-[family-name:var(--font-display)] tracking-tight text-success">
                R$ <NumberTicker value={lucro} />
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Calculator */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-primary-light border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <p className="text-sm">
                Se cobrar <span className="font-bold text-foreground">R$400</span> de <span className="font-bold text-foreground">10 clientes</span> = <span className="font-bold text-primary">R$4.000/mês</span> — Custo: R$597 — <span className="font-bold text-success">Lucro: R$3.403</span>
              </p>
            </div>
            <Button variant="outline" size="sm">Calculadora <ArrowRight className="w-3.5 h-3.5" /></Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client cards */}
      <div className="space-y-3">
        {clients.map((client, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.05 }}
          >
            <Card className="card-interactive">
              <CardContent className="p-5">
                <div className="flex items-center gap-5">
                  <Avatar size="lg">
                    <AvatarFallback>{client.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold">{client.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{client.site}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-40" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono">R$ {client.charge}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">/mês</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        {(client as any).id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingClientId((client as any).id);
                              setDeletingClientName(client.name);
                              setDeleteClientOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Score:</span>
                        <div className="w-16"><Progress value={client.score} variant={client.score >= 60 ? "success" : client.score >= 30 ? "warning" : "default"} /></div>
                        <span className="text-xs font-mono font-semibold">{client.score}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">AP:</span>
                        <span className="text-xs font-mono font-bold">{client.da}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Links:</span>
                        <span className="text-xs font-mono font-bold text-primary">{client.backlinks}</span>
                      </div>
                      <StatusTag status={client.phase === "Colhendo" ? "completed" : client.phase === "Crescendo" ? "active" : "pending"} label={client.phase} />
                      <Button variant="outline" size="sm" className="ml-auto gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Relatório
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Cliente</DialogTitle>
            <DialogDescription>Preencha os dados do novo cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Site URL</label>
              <Input value={clientSite} onChange={(e) => setClientSite(e.target.value)} placeholder="meusite.com.br" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Valor mensal (R$)</label>
              <Input type="number" value={clientCharge} onChange={(e) => setClientCharge(e.target.value)} placeholder="400" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddClient} disabled={addingClient}>
              {addingClient ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <Dialog open={deleteClientOpen} onOpenChange={setDeleteClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{deletingClientName}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClientOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteClient} disabled={deletingClient}>
              {deletingClient ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
