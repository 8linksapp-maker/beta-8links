"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Users,
  Search,
  Eye,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const USERS = [
  { id: 1, name: "Maria Santos", email: "maria@floricultura.com", plan: "Pro", status: "active" as const, sites: 3, credits: 120, joined: "2025-11-14" },
  { id: 2, name: "Pedro Lima", email: "pedro@techstart.io", plan: "Starter", status: "active" as const, sites: 1, credits: 30, joined: "2026-01-08" },
  { id: 3, name: "Ana Costa", email: "ana@yogazen.com.br", plan: "Agencia", status: "active" as const, sites: 7, credits: 450, joined: "2025-09-22" },
  { id: 4, name: "Lucas Souza", email: "lucas@gamesbr.com", plan: "Pro", status: "pending" as const, sites: 2, credits: 80, joined: "2026-03-01" },
  { id: 5, name: "Carla Dias", email: "carla@modafem.com", plan: "Starter", status: "active" as const, sites: 1, credits: 15, joined: "2026-02-17" },
  { id: 6, name: "Rafael Oliveira", email: "rafael@construtora.eng.br", plan: "Pro", status: "paused" as const, sites: 4, credits: 200, joined: "2025-10-05" },
  { id: 7, name: "Juliana Ferreira", email: "juliana@petshopbr.com", plan: "Agencia", status: "active" as const, sites: 12, credits: 800, joined: "2025-08-30" },
  { id: 8, name: "Marcos Almeida", email: "marcos@advocacia.adv.br", plan: "Starter", status: "error" as const, sites: 1, credits: 0, joined: "2026-04-02" },
];

const PLANS = ["Todos", "Starter", "Pro", "Agencia"] as const;

const planBadgeVariant = (plan: string) => {
  if (plan === "Agencia") return "success" as const;
  if (plan === "Pro") return "warning" as const;
  return "secondary" as const;
};

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("Todos");
  const [dbData, setDbData] = useState<any[]>([]);

  // Edit Role state
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | number | null>(null);
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserCurrentRole, setEditingUserCurrentRole] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [savingRole, setSavingRole] = useState(false);

  // Deactivate User state
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | number | null>(null);
  const [deactivatingUserName, setDeactivatingUserName] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("*, plans(name)").order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDbData(data.map((d: any) => ({
          id: d.id,
          name: d.name || d.email?.split("@")[0] || "Sem nome",
          email: d.email || "",
          plan: d.plans?.name || "Starter",
          status: d.status || "active",
          sites: d.sites_count ?? 0,
          credits: d.credits ?? 0,
          joined: d.created_at?.split("T")[0] || "",
        })));
      }
    }
    load();
  }, []);

  async function handleChangeRole() {
    if (!editingUserId) return;
    setSavingRole(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", editingUserId);
      if (error) throw error;
      setDbData(prev => prev.map(u => u.id === editingUserId ? { ...u, role: newRole } : u));
      toast.success("Role atualizado com sucesso!");
      setEditRoleOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar role");
    } finally {
      setSavingRole(false);
    }
  }

  async function handleDeactivateUser() {
    if (!deactivatingUserId) return;
    setDeactivating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ subscription_status: "canceled" }).eq("id", deactivatingUserId);
      if (error) throw error;
      setDbData(prev => prev.map(u => u.id === deactivatingUserId ? { ...u, status: "canceled" } : u));
      toast.success("Usuario desativado com sucesso!");
      setDeactivateOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar usuario");
    } finally {
      setDeactivating(false);
    }
  }

  const users = dbData.length > 0 ? dbData : USERS;

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "Todos" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title">Gestao de Usuarios</h1>
          <p className="page-description">Gerencie todos os clientes da plataforma</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PLANS.map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                planFilter === p
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(24_100%_55%/0.25)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
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
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sites</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Creditos</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cadastro</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarFallback>{user.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={planBadgeVariant(user.plan)}>{user.plan}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <StatusTag status={user.status} />
                      </td>
                      <td className="px-5 py-3 font-mono">{user.sites}</td>
                      <td className="px-5 py-3 font-mono">{user.credits}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground text-xs">
                        {new Date(user.joined).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingUserId(user.id);
                              setEditingUserName(user.name);
                              setEditingUserCurrentRole((user as any).role || "client");
                              setNewRole((user as any).role || "client");
                              setEditRoleOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeactivatingUserId(user.id);
                              setDeactivatingUserName(user.name);
                              setDeactivateOpen(true);
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

      {/* Edit Role Dialog */}
      <Dialog open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
            <DialogDescription>
              Altere o role de <strong>{editingUserName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role atual</label>
              <p className="text-sm text-muted-foreground capitalize">{editingUserCurrentRole}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Novo role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Cancelar</Button>
            <Button onClick={handleChangeRole} disabled={savingRole}>
              {savingRole ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Usuario</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar <strong>{deactivatingUserName}</strong>? O status sera alterado para cancelado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeactivateUser} disabled={deactivating}>
              {deactivating ? "Desativando..." : "Desativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
