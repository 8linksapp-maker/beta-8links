"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import {
  Link as LinkIcon,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusTag } from "@/components/ui/status-tag";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type QueueItem = {
  id: string;
  user: string;
  site: string;
  target?: string;
  title?: string;
  status: "pending" | "processing" | "active";
  statusLabel: string;
  created: string;
};

const BACKLINK_STATUS_MAP: Record<string, { ui: QueueItem["status"]; label: string }> = {
  queued: { ui: "pending", label: "Na Fila" },
  generating: { ui: "processing", label: "Gerando" },
  ready_for_review: { ui: "active", label: "Aguardando aprovação" },
};

const ARTICLE_STATUS_MAP: Record<string, { ui: QueueItem["status"]; label: string }> = {
  draft: { ui: "pending", label: "Rascunho" },
  optimizing: { ui: "processing", label: "Gerando" },
  ready: { ui: "active", label: "Pronto p/ publicar" },
  scheduled: { ui: "active", label: "Agendado" },
};

export default function QueuesPage() {
  const [backlinkQueue, setBacklinkQueue] = useState<QueueItem[]>([]);
  const [articleQueue, setArticleQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [{ data: blData }, { data: artData }] = await Promise.all([
        supabase
          .from("backlinks")
          .select("id, status, target_url, created_at, anchor_text, profiles(name, email), client_sites(url)")
          .in("status", Object.keys(BACKLINK_STATUS_MAP))
          .order("created_at"),
        supabase
          .from("articles")
          .select("id, status, title, created_at, profiles(name, email), client_sites(url)")
          .in("status", Object.keys(ARTICLE_STATUS_MAP))
          .order("created_at"),
      ]);

      setBacklinkQueue((blData ?? []).map((d: any) => {
        const map = BACKLINK_STATUS_MAP[d.status];
        return {
          id: d.id,
          user: d.profiles?.name || d.profiles?.email || "Desconhecido",
          site: d.client_sites?.url || "",
          target: d.target_url || d.anchor_text || "",
          status: map.ui,
          statusLabel: map.label,
          created: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        };
      }));

      setArticleQueue((artData ?? []).map((d: any) => {
        const map = ARTICLE_STATUS_MAP[d.status];
        return {
          id: d.id,
          user: d.profiles?.name || d.profiles?.email || "Desconhecido",
          site: d.client_sites?.url || "",
          title: d.title || "Sem título",
          status: map.ui,
          statusLabel: map.label,
          created: new Date(d.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        };
      }));

      setLoading(false);
    }
    load();
  }, []);

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
              {!loading && backlinkQueue.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum backlink em processamento</p>
              )}
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
                      <AvatarFallback>{item.user.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.user}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{item.site}{item.target ? ` → ${item.target}` : ""}</p>
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
              {!loading && articleQueue.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum artigo em processamento</p>
              )}
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
                      <AvatarFallback>{item.user.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{item.user} — {item.site}</p>
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
