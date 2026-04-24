"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  Link as LinkIcon,
  FileText,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const BACKLINK_QUEUE = [
  { id: 1, user: "Maria Santos", site: "floricultura.com", target: "portalrural.com.br", status: "processing" as const, statusLabel: "Gerando", created: "13 Abr, 14:32" },
  { id: 2, user: "Pedro Lima", site: "techstart.io", target: "vidadigital.com", status: "pending" as const, statusLabel: "Na Fila", created: "13 Abr, 13:15" },
  { id: 3, user: "Ana Costa", site: "yogazen.com.br", target: "fitnessbr.com", status: "pending" as const, statusLabel: "Na Fila", created: "13 Abr, 12:48" },
  { id: 4, user: "Lucas Souza", site: "gamesbr.com", target: "techblog.com.br", status: "active" as const, statusLabel: "Publicando", created: "13 Abr, 11:20" },
  { id: 5, user: "Juliana Ferreira", site: "petshopbr.com", target: "saudeanimal.vet.br", status: "processing" as const, statusLabel: "Gerando", created: "13 Abr, 10:05" },
];

const ARTICLE_QUEUE = [
  { id: 1, user: "Carla Dias", site: "modafem.com", title: "Tendencias Moda Inverno 2026", status: "processing" as const, statusLabel: "Gerando", created: "13 Abr, 14:50" },
  { id: 2, user: "Rafael Oliveira", site: "construtora.eng.br", title: "Reformas Sustentaveis em 2026", status: "active" as const, statusLabel: "Publicando", created: "13 Abr, 14:10" },
  { id: 3, user: "Maria Santos", site: "floricultura.com", title: "Plantas Resistentes ao Frio", status: "pending" as const, statusLabel: "Na Fila", created: "13 Abr, 13:30" },
  { id: 4, user: "Marcos Almeida", site: "advocacia.adv.br", title: "Direitos do Consumidor Online", status: "pending" as const, statusLabel: "Na Fila", created: "13 Abr, 12:00" },
  { id: 5, user: "Ana Costa", site: "yogazen.com.br", title: "Meditacao para Iniciantes", status: "processing" as const, statusLabel: "Gerando", created: "13 Abr, 11:45" },
];

function QueueIcon({ status }: { status: string }) {
  if (status === "processing") return <Loader2 className="w-3.5 h-3.5 animate-spin text-info" />;
  if (status === "active") return <Send className="w-3.5 h-3.5 text-success" />;
  return <Clock className="w-3.5 h-3.5 text-warning" />;
}

export default function QueuesPage() {
  const [dbBacklinks, setDbBacklinks] = useState<any[]>([]);
  const [dbArticles, setDbArticles] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: blData } = await supabase
        .from("backlinks")
        .select("*, profiles(name, email), client_sites(url)")
        .in("status", ["queued", "generating"])
        .order("created_at");
      if (blData && blData.length > 0) {
        setDbBacklinks(blData.map((d: any) => ({
          id: d.id,
          user: d.profiles?.name || d.profiles?.email || "Desconhecido",
          site: d.client_sites?.url || "",
          target: d.target_domain || "",
          status: d.status === "generating" ? "processing" as const : "pending" as const,
          statusLabel: d.status === "generating" ? "Gerando" : "Na Fila",
          created: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        })));
      }
      const { data: artData } = await supabase
        .from("articles")
        .select("*, profiles(name, email), client_sites(url)")
        .in("status", ["draft", "optimizing"])
        .order("created_at");
      if (artData && artData.length > 0) {
        setDbArticles(artData.map((d: any) => ({
          id: d.id,
          user: d.profiles?.name || d.profiles?.email || "Desconhecido",
          site: d.client_sites?.url || "",
          title: d.title || "Sem titulo",
          status: d.status === "optimizing" ? "processing" as const : "pending" as const,
          statusLabel: d.status === "optimizing" ? "Gerando" : "Na Fila",
          created: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        })));
      }
    }
    load();
  }, []);

  const backlinkQueue = dbBacklinks.length > 0 ? dbBacklinks : BACKLINK_QUEUE;
  const articleQueue = dbArticles.length > 0 ? dbArticles : ARTICLE_QUEUE;

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
          <h1 className="page-title">Filas de Processamento</h1>
          <p className="page-description">Acompanhe backlinks e artigos em tempo real</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backlink Queue */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-light flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-primary" />
                </div>
                <CardTitle>Fila de Backlinks</CardTitle>
                <Badge variant="outline" className="ml-auto font-mono">{backlinkQueue.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {backlinkQueue.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="sm">
                      <AvatarFallback>{item.user.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.user}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{item.site} → {item.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusTag status={item.status} label={item.statusLabel} />
                    <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">{item.created}</span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Article Queue */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary-light flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <CardTitle>Fila de Artigos</CardTitle>
                <Badge variant="outline" className="ml-auto font-mono">{articleQueue.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {articleQueue.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="sm">
                      <AvatarFallback>{item.user.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{item.user} - {item.site}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusTag status={item.status} label={item.statusLabel} />
                    <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">{item.created}</span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
