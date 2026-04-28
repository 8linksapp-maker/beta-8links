"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  UserPlus,
  Search,
  Eye,
  Pencil,
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

  // Edit User state
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", plan_id: "", subscription_status: "", role: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Create User state
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", plan_id: "starter", subscription_status: "active" });
  const [creating, setCreating] = useState(false);

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

  function openEditModal(user: any) {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      plan_id: user.plan || "starter",
      subscription_status: user.status || "active",
      role: user.role || "client",
    });
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/users/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editUser.id, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setDbData(prev => prev.map(u => u.id === editUser.id ? {
        ...u,
        name: editForm.name,
        email: editForm.email,
        plan: editForm.plan_id,
        status: editForm.subscription_status,
        role: editForm.role,
      } : u));
      toast.success("Usuario atualizado!");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSavingEdit(false);
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
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Último acesso</th>
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
                      <td className="px-5 py-3 text-xs">
                        <span className="font-mono text-muted-foreground">{user.joined ? new Date(user.joined).toLocaleDateString("pt-BR") : "—"}</span>
                        {user.joined && <span className="text-[10px] text-muted-foreground/50 ml-1">({timeAgo(user.joined)})</span>}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {user.lastSignIn ? (
                          <div>
                            <span className="font-mono text-muted-foreground">{new Date(user.lastSignIn).toLocaleDateString("pt-BR")}</span>
                            <span className="text-[10px] text-muted-foreground/50 ml-1">({timeAgo(user.lastSignIn)})</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40">Nunca</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/users/${user.id}`)}><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(user)}>
                            <Pencil className="w-4 h-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Usuario</DialogTitle>
            <DialogDescription>
              {editUser?.email} <span className="text-muted-foreground/50">·</span> ID: <span className="font-mono text-[10px]">{editUser?.id?.slice(0, 8)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Nome</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Email</label>
              <Input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Plano</label>
              <select
                value={editForm.plan_id}
                onChange={e => setEditForm(prev => ({ ...prev, plan_id: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="legacy_monthly">Legacy Mensal</option>
                <option value="legacy">Legacy Anual</option>
                <option value="lifetime">Lifetime</option>
                <option value="club">Club</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Status</label>
              <select
                value={editForm.subscription_status}
                onChange={e => setEditForm(prev => ({ ...prev, subscription_status: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="active">Ativo</option>
                <option value="trialing">Trial</option>
                <option value="past_due">Pendente</option>
                <option value="canceled">Cancelado</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Role</label>
              <select
                value={editForm.role}
                onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="min-w-[120px]">
              {savingEdit ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</> : "Salvar"}
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

function timeAgo(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  return `${years}a`;
}
