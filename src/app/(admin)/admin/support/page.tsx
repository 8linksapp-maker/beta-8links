"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  MessageSquare,
  Clock,
  Bot,
  Star,
  AlertCircle,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { MetricCard } from "@/components/ui/metric-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const CONVERSATIONS = [
  { id: 1, client: "Maria Santos", subject: "Backlink nao aparece no Google", status: "active" as const, statusLabel: "Aberto", waiting: "3 min", assigned: "Bot IA" },
  { id: 2, client: "Pedro Lima", subject: "Como adicionar segundo site?", status: "processing" as const, statusLabel: "Em Atendimento", waiting: "12 min", assigned: "Carlos" },
  { id: 3, client: "Lucas Souza", subject: "Pedido de cancelamento", status: "error" as const, statusLabel: "Urgente", waiting: "8 min", assigned: "Ana" },
  { id: 4, client: "Carla Dias", subject: "Duvida sobre creditos extras", status: "pending" as const, statusLabel: "Aguardando", waiting: "25 min", assigned: "Bot IA" },
  { id: 5, client: "Rafael Oliveira", subject: "Erro ao gerar artigo", status: "active" as const, statusLabel: "Aberto", waiting: "5 min", assigned: "Carlos" },
  { id: 6, client: "Juliana Ferreira", subject: "Upgrade para plano Agencia", status: "completed" as const, statusLabel: "Resolvido", waiting: "-", assigned: "Bot IA" },
];

export default function SupportPage() {
  const [dbData, setDbData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("conversations")
        .select("*, profiles!conversations_client_id_fkey(name, email)")
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDbData(data.map((d: any) => ({
          id: d.id,
          client: d.profiles?.name || d.profiles?.email || "Desconhecido",
          subject: d.subject || "",
          status: d.status || "active",
          statusLabel: d.status === "active" ? "Aberto" : d.status === "processing" ? "Em Atendimento" : d.status === "error" ? "Urgente" : d.status === "completed" ? "Resolvido" : "Aguardando",
          waiting: d.waiting_time || "-",
          assigned: d.assigned_to || "Bot IA",
        })));
      }
    }
    load();
  }, []);

  const conversations = dbData.length > 0 ? dbData : CONVERSATIONS;

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
          <h1 className="page-title">Painel de Suporte</h1>
          <p className="page-description">Monitore conversas e metricas de atendimento</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Tempo Medio Resposta"
          value={4}
          suffix=" min"
          icon={Clock}
          change={{ value: "-2 min", positive: true }}
        />
        <MetricCard
          label="Resolucao Bot"
          value={72}
          suffix="%"
          icon={Bot}
          change={{ value: "+8%", positive: true }}
        />
        <MetricCard
          label="CSAT"
          value={4.6}
          decimalPlaces={1}
          suffix="/5"
          icon={Star}
          change={{ value: "+0.3", positive: true }}
        />
        <MetricCard
          label="Tickets Abertos"
          value={5}
          icon={AlertCircle}
          change={{ value: "+2", positive: false }}
        />
      </motion.div>

      {/* Conversations */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <CardTitle>Conversas Recentes</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assunto</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Esperando</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atribuido</th>
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv, i) => (
                    <motion.tr
                      key={conv.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.12 + i * 0.03 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarFallback>{conv.client.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{conv.client}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[250px] truncate">{conv.subject}</td>
                      <td className="px-5 py-3">
                        <StatusTag status={conv.status} label={conv.statusLabel} />
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{conv.waiting}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {conv.assigned === "Bot IA" ? (
                            <Bot className="w-3.5 h-3.5 text-info" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs">{conv.assigned}</span>
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
    </div>
  );
}
