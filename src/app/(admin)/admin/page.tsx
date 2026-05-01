"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  DollarSign, Users, Link as LinkIcon, FileText, MessageSquare,
  AlertTriangle, ArrowRight, ChevronRight, Activity, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusTag } from "@/components/ui/status-tag";

type RecentUser = {
  name: string;
  email: string;
  plan: string;
  date: string;
  status: "active" | "pending";
};

type PlanDistribution = {
  plan: string;
  count: number;
  pct: number;
  revenue: number;
  color: "default" | "warning" | "success";
};

type DashboardAlert = {
  type: "warning" | "info" | "danger";
  msg: string;
  href: string;
  action: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    mrr: 0,
    arpu: 0,
    backlinksPeriod: 0,
    successRate: null as number | null,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [planDist, setPlanDist] = useState<PlanDistribution[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [profilesRes, monitorRes] = await Promise.all([
        supabase.from("profiles").select("*, plans(price_brl, name)").order("created_at", { ascending: false }),
        fetch("/api/admin/api-monitor?period=month").then(r => r.json()).catch(() => null),
      ]);

      const profiles = profilesRes.data ?? [];
      const active = profiles.filter((p: any) => p.subscription_status === "active" || p.subscription_status === "trialing");
      const mrr = active.reduce((acc: number, p: any) => acc + (p.plans?.price_brl ?? 0), 0);
      const arpu = active.length > 0 ? Math.round(mrr / active.length) : 0;

      // Plan distribution
      const planMap = new Map<string, { count: number; revenue: number; name: string }>();
      for (const p of active) {
        const key = p.plan_id;
        const existing = planMap.get(key) ?? { count: 0, revenue: 0, name: p.plans?.name ?? key };
        existing.count++;
        existing.revenue += p.plans?.price_brl ?? 0;
        planMap.set(key, existing);
      }
      const colorByPlan: Record<string, "default" | "warning" | "success"> = {
        starter: "default", pro: "warning", agency: "success",
      };
      const dist = Array.from(planMap.entries()).map(([id, v]) => ({
        plan: v.name,
        count: v.count,
        pct: active.length > 0 ? Math.round((v.count / active.length) * 100) : 0,
        revenue: v.revenue,
        color: colorByPlan[id] ?? "default",
      }));

      // Recent users (latest 5)
      const recents: RecentUser[] = profiles.slice(0, 5).map((p: any) => ({
        name: p.name ?? p.email.split("@")[0],
        email: p.email,
        plan: p.plans?.name ?? p.plan_id,
        date: new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        status: p.subscription_status === "active" || p.subscription_status === "trialing" ? "active" : "pending",
      }));

      // Real alerts from monitor data
      const realAlerts: DashboardAlert[] = [];
      if (monitorRes?.backlinks?.errorsPeriod > 0) {
        realAlerts.push({
          type: "danger",
          msg: `${monitorRes.backlinks.errorsPeriod} backlink(s) com erro este mês`,
          href: "/admin/queues",
          action: "Ver fila",
        });
      }
      if (monitorRes?.backlinks?.queued > 5) {
        realAlerts.push({
          type: "warning",
          msg: `${monitorRes.backlinks.queued} backlinks aguardando processamento`,
          href: "/admin/queues",
          action: "Ver fila",
        });
      }
      if ((monitorRes?.health?.inactive14d ?? 0) > 0) {
        realAlerts.push({
          type: "warning",
          msg: `${monitorRes.health.inactive14d} cliente(s) ativo(s) sem usar a plataforma há 14+ dias`,
          href: "/admin/users",
          action: "Ver usuários",
        });
      }
      if (monitorRes?.backlinks?.successRate != null && monitorRes.backlinks.successRate < 70) {
        realAlerts.push({
          type: "danger",
          msg: `Taxa de sucesso de backlinks em ${monitorRes.backlinks.successRate}% — abaixo do esperado`,
          href: "/admin/monitor",
          action: "Investigar",
        });
      }

      setStats({
        totalUsers: profiles.length,
        activeUsers: active.length,
        mrr,
        arpu,
        backlinksPeriod: monitorRes?.backlinks?.published ?? 0,
        successRate: monitorRes?.backlinks?.successRate ?? null,
      });
      setRecentUsers(recents);
      setPlanDist(dist);
      setAlerts(realAlerts);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={stats.mrr} prefix="R$ " icon={DollarSign} sub={`R$ ${stats.arpu}/cliente médio`} />
        <KpiCard label="Clientes Ativos" value={stats.activeUsers} icon={Users} sub={`${stats.totalUsers} total cadastrados`} />
        <KpiCard label="Backlinks (mês)" value={stats.backlinksPeriod} icon={LinkIcon} sub="Publicados com sucesso" />
        <KpiCard
          label="Taxa de Sucesso"
          value={stats.successRate ?? 0}
          suffix={stats.successRate == null ? "" : "%"}
          icon={TrendingUp}
          sub={stats.successRate == null ? "Sem dados ainda" : "Backlinks publicados / tentados"}
        />
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${
              alert.type === "danger" ? "bg-destructive/10 border-destructive/30" :
              alert.type === "warning" ? "bg-warning-light border-warning/20" :
              "bg-info-light border-info/20"
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-4 h-4 ${
                  alert.type === "danger" ? "text-destructive" :
                  alert.type === "warning" ? "text-warning" :
                  "text-info"
                }`} />
                <span className="text-sm">{alert.msg}</span>
              </div>
              <Link href={alert.href}>
                <Button variant="ghost" size="sm" className="shrink-0">{alert.action} <ChevronRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          ))}
        </motion.div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-success-light border-success/20">
          <Activity className="w-4 h-4 text-success" />
          <span className="text-sm">Tudo rodando bem — nenhum alerta ativo.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan distribution (real) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Plano</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {planDist.length === 0 && !loading && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum cliente ativo ainda</p>
              )}
              {planDist.map((item) => (
                <div key={item.plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.plan}</span>
                      <span className="text-xs font-mono text-muted-foreground">{item.count} cliente{item.count === 1 ? "" : "s"}</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-primary">R$ {item.revenue.toLocaleString("pt-BR")}</span>
                  </div>
                  <Progress value={item.pct} variant={item.color} />
                </div>
              ))}
              {planDist.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold font-mono">{stats.activeUsers} cliente{stats.activeUsers === 1 ? "" : "s"} • R$ {stats.mrr.toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Activity, label: "Monitor de APIs", href: "/admin/monitor" },
                { icon: Users, label: "Gestão de Usuários", href: "/admin/users" },
                { icon: LinkIcon, label: "Rede de Sites", href: "/admin/network" },
                { icon: FileText, label: "Fila de Backlinks", href: "/admin/queues" },
                { icon: MessageSquare, label: "Painel de Suporte", href: "/admin/support" },
              ].map((action, i) => (
                <Link key={i} href={action.href}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                      <action.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm">{action.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent users */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Últimos Clientes</CardTitle>
              <Link href="/admin/users">
                <Button variant="ghost" size="sm">Ver todos <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhum cliente cadastrado ainda</p>
            )}
            <div className="space-y-2">
              {recentUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm"><AvatarFallback>{user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-[10px]">{user.plan}</Badge>
                    <StatusTag status={user.status} />
                    <span className="text-xs font-mono text-muted-foreground">{user.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function KpiCard({ label, value, prefix, suffix, icon: Icon, sub }: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: any;
  sub?: string;
}) {
  return (
    <Card className="card-beam relative overflow-hidden p-5">
      <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
      <div className="flex items-center justify-between mb-3 relative">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight relative">
        {prefix}<NumberTicker value={value} />{suffix}
      </p>
      {sub && <p className="text-xs text-muted-foreground font-mono mt-1">{sub}</p>}
    </Card>
  );
}
