"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  DollarSign, Users, TrendingDown, TrendingUp,
  Link as LinkIcon, FileText, MessageSquare, AlertTriangle,
  ArrowRight, ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusTag } from "@/components/ui/status-tag";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const mrrData = [
  { month: "Set", mrr: 4200 },
  { month: "Out", mrr: 5100 },
  { month: "Nov", mrr: 6400 },
  { month: "Dez", mrr: 7800 },
  { month: "Jan", mrr: 9200 },
  { month: "Fev", mrr: 11500 },
  { month: "Mar", mrr: 13800 },
  { month: "Abr", mrr: 15600 },
];

const recentUsers = [
  { name: "Maria Santos", email: "maria@floricultura.com", plan: "Pro", date: "14 Abr", status: "active" as const },
  { name: "Pedro Lima", email: "pedro@techstart.io", plan: "Starter", date: "13 Abr", status: "active" as const },
  { name: "Ana Costa", email: "ana@yogazen.com.br", plan: "Agência", date: "12 Abr", status: "active" as const },
  { name: "Lucas Souza", email: "lucas@gamesbr.com", plan: "Pro", date: "11 Abr", status: "pending" as const },
  { name: "Carla Dias", email: "carla@modafem.com", plan: "Starter", date: "10 Abr", status: "active" as const },
];

const alerts = [
  { type: "warning", msg: "3 tickets de suporte sem resposta há 10+ min", action: "Ver tickets" },
  { type: "info", msg: "Fila de backlinks: 42 pendentes", action: "Ver fila" },
  { type: "warning", msg: "Cliente 'Lucas Souza' pediu cancelamento", action: "Reter" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, mrr: 0, activeUsers: 0 });
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      // Fetch all profiles (admin has RLS access to all)
      const { data: profiles } = await supabase.from("profiles").select("*, plans(price_brl, name)").order("created_at", { ascending: false });
      if (profiles) {
        setDbUsers(profiles.slice(0, 5).map((p: any) => ({
          name: p.name ?? p.email.split("@")[0],
          email: p.email,
          plan: p.plans?.name ?? p.plan_id,
          date: new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          status: p.subscription_status === "active" || p.subscription_status === "trialing" ? "active" : "pending",
        })));
        const active = profiles.filter((p: any) => p.subscription_status === "active" || p.subscription_status === "trialing");
        const mrr = active.reduce((acc: number, p: any) => acc + (p.plans?.price_brl ?? 0), 0);
        setStats({ totalUsers: profiles.length, mrr, activeUsers: active.length });
      }
    }
    load();
  }, []);
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: 15600, prefix: "R$ ", icon: DollarSign, change: "+13%", positive: true },
          { label: "Clientes Ativos", value: 87, icon: Users, change: "+8", positive: true },
          { label: "Churn Mensal", value: 4.2, suffix: "%", icon: TrendingDown, change: "-1.3%", positive: true },
          { label: "LTV Médio", value: 2840, prefix: "R$ ", icon: TrendingUp, change: "+R$320", positive: true },
        ].map((kpi, i) => (
          <Card key={i} className="card-beam relative overflow-hidden p-5">
            <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3 relative">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{kpi.label}</span>
              <kpi.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight relative">
              {kpi.prefix}<NumberTicker value={kpi.value} decimalPlaces={kpi.label === "Churn Mensal" ? 1 : 0} />{kpi.suffix}
            </p>
            <p className={`text-xs font-semibold font-mono mt-1 ${kpi.positive ? 'text-success' : 'text-destructive'}`}>{kpi.change}</p>
          </Card>
        ))}
      </motion.div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${alert.type === "warning" ? "bg-warning-light border-warning/20" : "bg-info-light border-info/20"}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-4 h-4 ${alert.type === "warning" ? "text-warning" : "text-info"}`} />
                <span className="text-sm">{alert.msg}</span>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">{alert.action} <ChevronRight className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Receita Recorrente (MRR)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={mrrData}>
                  <defs>
                    <linearGradient id="gradMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(24, 100%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(20, 10%, 12%)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(20, 8%, 50%)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                  <RechartsTooltip contentStyle={{ background: 'hsl(20, 12%, 7%)', border: '1px solid hsl(20, 10%, 18%)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }} />
                  <Area type="monotone" dataKey="mrr" stroke="hsl(24, 100%, 55%)" strokeWidth={2.5} fill="url(#gradMrr)" name="MRR (R$)" dot={false} activeDot={{ r: 4, fill: 'hsl(24, 100%, 55%)', stroke: 'hsl(20, 12%, 7%)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan distribution */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Plano</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { plan: "Starter", count: 42, pct: 48, revenue: "R$ 6.174", color: "default" as const },
                { plan: "Pro", count: 32, pct: 37, revenue: "R$ 9.504", color: "warning" as const },
                { plan: "Agência", count: 13, pct: 15, revenue: "R$ 7.761", color: "success" as const },
              ].map((item) => (
                <div key={item.plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{item.plan}</span>
                      <span className="text-xs font-mono text-muted-foreground">{item.count} clientes</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-primary">{item.revenue}</span>
                  </div>
                  <Progress value={item.pct} variant={item.color} />
                </div>
              ))}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold font-mono">87 clientes • R$ 23.439</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent users + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Últimos Clientes</CardTitle>
                <Button variant="ghost" size="sm">Ver todos <ArrowRight className="w-3.5 h-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentUsers.map((user, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm"><AvatarFallback>{user.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
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

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="h-full">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ações Rápidas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Users, label: "Gestão de Usuários", href: "/admin/users" },
                { icon: LinkIcon, label: "Rede de Sites", href: "/admin/network" },
                { icon: FileText, label: "Fila de Backlinks", href: "/admin/queues" },
                { icon: MessageSquare, label: "Painel de Suporte", href: "/admin/support" },
              ].map((action, i) => (
                <Button key={i} variant="ghost" className="w-full justify-start gap-3 h-auto py-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm">{action.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
