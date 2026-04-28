"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const PLAN_FILTERS = ["Todos", "starter", "pro", "legacy_monthly", "legacy", "lifetime", "club"] as const;
const STATUS_FILTERS = ["Todos", "active", "trialing", "past_due", "canceled"] as const;
const STATUS_LABELS: Record<string, string> = { Todos: "Todos", active: "Ativo", trialing: "Trial", past_due: "Pendente", canceled: "Cancelado" };

const planBadgeVariant = (plan: string) => {
  if (plan === "lifetime") return "success" as const;
  if (plan === "legacy" || plan === "legacy_monthly") return "info" as const;
  if (plan === "pro") return "warning" as const;
  return "secondary" as const;
};

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("Todos");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [dbData, setDbData] = useState<any[]>([]);

  // Edit Role state
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | number | null>(null);
  const [editingUserName, setEditingUserName] = useState("");
  const [editingUserCurrentRole, setEditingUserCurrentRole] = useState("");
  const [newRole, setNewRole] = useState("client");
  const [savingRole, setSavingRole] = useState(false);

  // Create User state
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", plan_id: "starter", subscription_status: "active" });
  const [creating, setCreating] = useState(false);

  // Deactivate User state
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | number | null>(null);
  const [deactivatingUserName, setDeactivatingUserName] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/users");
        const data = await res.json();
        if (data.users) setDbData(data.users);
      } catch {}
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

  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.plan_id) {
      toast.error("Preencha email, senha e plano");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar usuario");
      // Add to local list
      setDbData(prev => [{
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        plan: data.user.plan,
        role: "client",
        status: data.user.status,
        sites: 0,
        backlinks: 0,
        joined: new Date().toISOString().split("T")[0],
      }, ...prev]);
      toast.success(`Usuario ${data.user.email} criado com sucesso!`);
      setCreateOpen(false);
      setNewUser({ email: "", name: "", password: "", plan_id: "starter", subscription_status: "active" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar usuario");
    } finally {
      setCreating(false);
    }
  }

  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<"joined" | "sites" | "backlinks">("joined");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const PER_PAGE = 25;

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(col); setSortDir("desc"); }
    setPage(0);
  };

  const users = dbData;

  const filtered = users
    .filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesPlan = planFilter === "Todos" || u.plan === planFilter;
      const matchesStatus = statusFilter === "Todos" || u.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    })
    .sort((a, b) => {
      const mult = sortDir === "desc" ? -1 : 1;
      if (sortBy === "sites") return (a.sites - b.sites) * mult;
      if (sortBy === "backlinks") return ((a.backlinks ?? 0) - (b.backlinks ?? 0)) * mult;
      return (new Date(a.joined).getTime() - new Date(b.joined).getTime()) * mult;
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageItems = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

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
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" /> Novo Usuario
        </Button>
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
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PLAN_FILTERS.map((p) => (
            <button
              key={p}
              onClick={() => { setPlanFilter(p); setPage(0); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                planFilter === p
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(24_100%_55%/0.25)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="w-px h-6 bg-border self-center mx-1" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(24_100%_55%/0.25)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[s]}
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
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuário</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("sites")}>
                      Sites {sortBy === "sites" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("backlinks")}>
                      Backlinks {sortBy === "backlinks" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => toggleSort("joined")}>
                      Cadastro {sortBy === "joined" && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((user, i) => (
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
                        <Badge variant={user.status === "active" ? "success" : user.status === "trialing" ? "info" : user.status === "past_due" ? "warning" : "outline"} className="text-[10px]">
                          {user.status === "active" ? "Ativo" : user.status === "trialing" ? "Trial" : user.status === "past_due" ? "Pendente" : "Cancelado"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold">{user.sites}</td>
                      <td className="px-5 py-3 font-mono">{user.backlinks ?? 0}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground text-xs">
                        {new Date(user.joined).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/users/${user.id}`)}><Eye className="w-4 h-4" /></Button>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground font-mono">
                  {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, filtered.length)} de {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</Button>
                </div>
              </div>
            )}
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

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Novo Usuario</DialogTitle>
            <DialogDescription>Crie uma conta e atribua um plano</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Email *</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome</label>
              <Input
                placeholder="Nome do usuario"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Senha *</label>
              <Input
                type="password"
                placeholder="Minimo 6 caracteres"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Plano *</label>
              <select
                value={newUser.plan_id}
                onChange={(e) => setNewUser(prev => ({ ...prev, plan_id: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="starter">Starter — R$197/mes</option>
                <option value="pro">Pro — R$397/mes</option>
                <option value="legacy_monthly">Legacy Mensal — R$97/mes</option>
                <option value="legacy">Legacy Anual — R$997/ano</option>
                <option value="lifetime">Lifetime — R$1.997</option>
                <option value="club">Club — R$197/mes</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <select
                value={newUser.subscription_status}
                onChange={(e) => setNewUser(prev => ({ ...prev, subscription_status: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="active">Ativo</option>
                <option value="trialing">Trial</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating} className="min-w-[140px]">
              {creating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Criando...</> : "Criar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
