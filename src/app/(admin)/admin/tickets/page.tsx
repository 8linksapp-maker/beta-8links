"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare, Bug, Lightbulb, CircleHelp, Send,
  CheckCircle2, Clock, AlertCircle, RefreshCw, ChevronDown, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const CAT_MAP: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "text-destructive" },
  feature: { label: "Sugestão", icon: Lightbulb, color: "text-warning" },
  question: { label: "Dúvida", icon: CircleHelp, color: "text-info" },
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("id, subject, status, category, channel, created_at, client_id, profiles!conversations_client_id_fkey(email, name)")
      .order("created_at", { ascending: false })
      .limit(100);
    setTickets(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadMessages = async (ticket: any) => {
    setSelected(ticket);
    const supabase = createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_type, sender_id, sent_at, screenshot_url")
      .eq("conversation_id", ticket.id)
      .order("sent_at", { ascending: true });
    setMessages(data ?? []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("messages").insert({
      conversation_id: selected.id,
      sender_type: "staff",
      sender_id: user?.id,
      content: reply,
    });

    // Update status to in_progress if was open
    if (selected.status === "open") {
      await supabase.from("conversations").update({ status: "in_progress" }).eq("id", selected.id);
      setSelected({ ...selected, status: "in_progress" });
      setTickets(prev => prev.map(t => t.id === selected.id ? { ...t, status: "in_progress" } : t));
    }

    setMessages(prev => [...prev, { id: Date.now(), content: reply, sender_type: "staff", sent_at: new Date().toISOString() }]);
    setReply("");
    setSending(false);
    toast.success("Resposta enviada");
  };

  const updateStatus = async (ticketId: string, status: string) => {
    const supabase = createClient();
    await supabase.from("conversations").update({ status }).eq("id", ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status } : t));
    if (selected?.id === ticketId) setSelected({ ...selected, status });
    toast.success(`Status: ${status}`);
  };

  const filtered = tickets.filter(t => filter === "all" || t.status === filter);
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
  };

  const statusBadge = (s: string) => {
    if (s === "open") return <Badge variant="warning" className="text-[9px]">Aberto</Badge>;
    if (s === "in_progress") return <Badge variant="processing" className="text-[9px]">Em andamento</Badge>;
    return <Badge variant="success" className="text-[9px]">Resolvido</Badge>;
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">Tickets de Suporte</h1>
          <p className="text-sm text-muted-foreground">{counts.open} abertos · {counts.in_progress} em andamento</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={load}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {(["all", "open", "in_progress", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {f === "all" ? "Todos" : f === "open" ? "Abertos" : f === "in_progress" ? "Em andamento" : "Resolvidos"}
            <span className="ml-1 font-mono text-[10px]">({counts[f]})</span>
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Ticket list */}
        <div className="w-[380px] shrink-0 space-y-1 max-h-[75vh] overflow-y-auto">
          {filtered.map(t => {
            const cat = CAT_MAP[t.category || t.channel] ?? CAT_MAP.question;
            const CatIcon = cat.icon;
            const profile = t.profiles;
            const isSelected = selected?.id === t.id;
            return (
              <div key={t.id} onClick={() => loadMessages(t)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30"}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <CatIcon className={`w-3.5 h-3.5 shrink-0 ${cat.color}`} />
                    <span className="text-sm font-medium truncate">{t.subject || "Sem assunto"}</span>
                  </div>
                  {statusBadge(t.status)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{profile?.name || profile?.email || "—"}</span>
                  <span className="font-mono">{new Date(t.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket</p>}
        </div>

        {/* Conversation */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <Card className="h-[75vh] flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold">{selected.subject}</h3>
                  <p className="text-[10px] text-muted-foreground">{selected.profiles?.email ?? "—"} · {new Date(selected.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selected.status !== "resolved" && (
                    <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => updateStatus(selected.id, "resolved")}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Resolver
                    </Button>
                  )}
                  {selected.status === "resolved" && (
                    <Button variant="outline" size="sm" className="text-[10px] h-7" onClick={() => updateStatus(selected.id, "open")}>
                      Reabrir
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.sender_type === "staff" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                      m.sender_type === "staff" ? "bg-primary/10 text-foreground" :
                      m.sender_type === "bot" ? "bg-info/10 text-foreground" :
                      "bg-muted text-foreground"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                      {m.screenshot_url && (
                        <a href={m.screenshot_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                          <img src={m.screenshot_url} alt="Screenshot" className="max-w-[300px] rounded-lg border border-border" />
                        </a>
                      )}
                      <p className="text-[9px] text-muted-foreground mt-1">
                        {m.sender_type === "staff" ? "Equipe" : m.sender_type === "bot" ? "Bot" : "Cliente"} · {new Date(m.sent_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="p-4 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Textarea placeholder="Responder..." rows={2} value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendReply(); }}
                    className="text-sm" />
                  <Button onClick={sendReply} disabled={sending || !reply.trim()} className="shrink-0 self-end">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">Ctrl+Enter para enviar</p>
              </div>
            </Card>
          ) : (
            <Card className="h-[75vh] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Selecione um ticket para ver a conversa</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
