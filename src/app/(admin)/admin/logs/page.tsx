"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  ScrollText,
  Filter,
  Link as LinkIcon,
  UserPlus,
  FileText,
  Webhook,
  CreditCard,
  AlertTriangle,
  Settings,
  LogIn,
  Trash2,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type EventType = "backlink_created" | "user_signup" | "article_generated" | "webhook_received" | "payment_success" | "error" | "config_changed" | "user_login" | "site_deleted" | "email_sent";

const EVENT_CONFIG: Record<EventType, { label: string; icon: React.ElementType; variant: "default" | "success" | "info" | "warning" | "error" | "processing" | "secondary" }> = {
  backlink_created: { label: "Backlink Criado", icon: LinkIcon, variant: "success" },
  user_signup: { label: "Novo Cadastro", icon: UserPlus, variant: "info" },
  article_generated: { label: "Artigo Gerado", icon: FileText, variant: "processing" },
  webhook_received: { label: "Webhook Recebido", icon: Webhook, variant: "secondary" },
  payment_success: { label: "Pagamento", icon: CreditCard, variant: "success" },
  error: { label: "Erro", icon: AlertTriangle, variant: "error" },
  config_changed: { label: "Config Alterada", icon: Settings, variant: "warning" },
  user_login: { label: "Login", icon: LogIn, variant: "secondary" },
  site_deleted: { label: "Site Removido", icon: Trash2, variant: "error" },
  email_sent: { label: "Email Enviado", icon: Mail, variant: "info" },
};

const LOGS = [
  { id: 1, timestamp: "2026-04-13 15:02:14", user: "sistema", event: "backlink_created" as EventType, details: "Backlink publicado: techblog.com.br → floricultura.com/blog", ip: "10.0.0.1" },
  { id: 2, timestamp: "2026-04-13 14:58:33", user: "marcos@advocacia.adv.br", event: "user_signup" as EventType, details: "Novo usuario cadastrado no plano Starter", ip: "189.42.115.22" },
  { id: 3, timestamp: "2026-04-13 14:45:07", user: "sistema", event: "article_generated" as EventType, details: "Artigo 'Tendencias Moda Inverno 2026' gerado para modafem.com", ip: "10.0.0.1" },
  { id: 4, timestamp: "2026-04-13 14:30:12", user: "stripe", event: "webhook_received" as EventType, details: "Webhook invoice.payment_succeeded para cliente maria@floricultura.com", ip: "54.187.174.169" },
  { id: 5, timestamp: "2026-04-13 14:22:45", user: "maria@floricultura.com", event: "payment_success" as EventType, details: "Pagamento R$ 297,00 confirmado - Plano Pro", ip: "201.17.88.143" },
  { id: 6, timestamp: "2026-04-13 14:10:03", user: "sistema", event: "error" as EventType, details: "Falha ao conectar DataForSEO API - timeout apos 30s", ip: "10.0.0.1" },
  { id: 7, timestamp: "2026-04-13 13:55:18", user: "admin@8links.com.br", event: "config_changed" as EventType, details: "Regra de distribuicao alterada: max backlinks/dia 3 → 5", ip: "177.96.42.7" },
  { id: 8, timestamp: "2026-04-13 13:40:22", user: "pedro@techstart.io", event: "user_login" as EventType, details: "Login realizado com sucesso", ip: "189.42.115.22" },
  { id: 9, timestamp: "2026-04-13 13:15:44", user: "rafael@construtora.eng.br", event: "site_deleted" as EventType, details: "Site construtora-blog.com removido pelo usuario", ip: "200.158.33.91" },
  { id: 10, timestamp: "2026-04-13 12:50:09", user: "sistema", event: "email_sent" as EventType, details: "Email de boas-vindas enviado para marcos@advocacia.adv.br", ip: "10.0.0.1" },
];

const FILTER_OPTIONS = ["Todos", "backlink_created", "user_signup", "article_generated", "webhook_received", "error"] as const;

export default function LogsPage() {
  const [filter, setFilter] = useState<string>("Todos");
  const [dbData, setDbData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("event_logs")
        .select("*, profiles(name, email)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data && data.length > 0) {
        setDbData(data.map((d: any) => ({
          id: d.id,
          timestamp: d.created_at?.replace("T", " ").slice(0, 19) || "",
          user: d.profiles?.email || d.user || "sistema",
          event: (d.event_type || d.event || "user_login") as EventType,
          details: d.details || d.message || "",
          ip: d.ip || "-",
        })));
      }
    }
    load();
  }, []);

  const logs = dbData.length > 0 ? dbData : LOGS;

  const filtered = filter === "Todos" ? logs : logs.filter((l) => l.event === filter);

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
          <h1 className="page-title">Logs do Sistema</h1>
          <p className="page-description">Historico de eventos e atividades da plataforma</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="flex gap-2 flex-wrap"
      >
        {FILTER_OPTIONS.map((f) => {
          const label = f === "Todos" ? "Todos" : EVENT_CONFIG[f as EventType]?.label ?? f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(24_100%_55%/0.25)]"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
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
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usuario</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Evento</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const config = EVENT_CONFIG[log.event as keyof typeof EVENT_CONFIG] ?? EVENT_CONFIG.user_login;
                    const Icon = config.icon;
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                        <td className="px-5 py-3 font-mono text-xs">{log.user}</td>
                        <td className="px-5 py-3">
                          <Badge variant={config.variant} className="gap-1">
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs max-w-[300px] truncate">{log.details}</td>
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{log.ip}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
