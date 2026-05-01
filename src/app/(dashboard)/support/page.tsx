"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";
import { humanizeError } from "@/lib/utils/error-messages";
import {
  MessageSquare, Send, Search, HelpCircle, ChevronRight,
  Bug, Lightbulb, CircleHelp, Clock,
  Plus, ImagePlus, X, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { value: "bug", label: "Bug / Erro", icon: Bug, color: "text-destructive" },
  { value: "feature", label: "Sugestão", icon: Lightbulb, color: "text-warning" },
  { value: "question", label: "Dúvida", icon: CircleHelp, color: "text-info" },
] as const;

const faqs = [
  { q: "Quanto tempo demora para ver resultados?", a: "Os primeiros resultados aparecem entre 30-60 dias. Backlinks levam tempo para serem indexados pelo Google." },
  { q: "Como funciona a criação de backlinks?", a: "Você escolhe a keyword, o sistema gera um artigo de qualidade num site parceiro e insere o link pro seu site naturalmente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem fidelidade ou multa. Cancele a qualquer momento nas configurações." },
  { q: "Como conecto o Google Search Console?", a: "Vá em Meus Sites → clique no site → Conectar Google. Você autoriza o acesso e pronto." },
  { q: "Os backlinks são permanentes?", a: "Sim, os artigos ficam publicados permanentemente nos sites parceiros." },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // New ticket
  const [createOpen, setCreateOpen] = useState(false);
  const [category, setCategory] = useState<string>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // FAQ
  const [searchFaq, setSearchFaq] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase
        .from("conversations")
        .select("id, subject, status, channel, category, created_at, messages(id)")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setTickets((data ?? []).map((c: any) => ({
        id: c.id, subject: c.subject || "Sem assunto",
        category: c.category || c.channel || "question",
        status: c.status || "open", date: c.created_at,
        messages: c.messages?.length ?? 0,
      })));
      setLoaded(true);
    }
    load();
  }, []);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter(f => f.type.startsWith("image/")).slice(0, 3);
    setScreenshots(prev => [...prev, ...images].slice(0, 3));
    images.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setScreenshotPreviews(prev => [...prev, ev.target?.result as string].slice(0, 3));
      reader.readAsDataURL(f);
    });
  };

  const removeScreenshot = (i: number) => {
    setScreenshots(prev => prev.filter((_, j) => j !== i));
    setScreenshotPreviews(prev => prev.filter((_, j) => j !== i));
  };

  const handleCreate = async () => {
    if (!subject.trim() || !description.trim()) { toast.error("Preencha assunto e descrição"); return; }
    setSending(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Sessão expirada — faça login novamente"); setSending(false); return; }

    // Step 1: Create conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({ client_id: user.id, channel: "platform", category, subject, status: "open" })
      .select().single();

    if (convErr || !conv) {
      const technical = convErr?.message ?? "Resposta vazia ao criar ticket";
      console.error("[support] failed to create conversation:", convErr);
      Sentry.captureException(new Error(`Ticket creation failed: ${technical}`), {
        tags: { feature: "support" },
        extra: { userId: user.id, category, subject: subject.slice(0, 80) },
      });
      toast.error(humanizeError(technical).user);
      setSending(false);
      return;
    }

    // Step 2: Upload screenshots (non-fatal — ticket is already created)
    const uploadedUrls: string[] = [];
    const failedUploads: string[] = [];
    for (const file of screenshots) {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `tickets/${conv.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("support").upload(path, file);
      if (upErr) {
        failedUploads.push(file.name);
        console.error(`[support] screenshot upload failed (${file.name}):`, upErr);
      } else {
        const { data: urlData } = supabase.storage.from("support").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
    }

    if (failedUploads.length > 0) {
      Sentry.captureMessage(`Screenshot upload failed (${failedUploads.length}/${screenshots.length})`, {
        level: "warning",
        tags: { feature: "support" },
        extra: { conversationId: conv.id, failedUploads },
      });
    }

    // Step 3: Save the first message
    let content = description;
    if (uploadedUrls.length > 0) {
      content += "\n\n---\nScreenshots:\n" + uploadedUrls.map((u, i) => `${i + 1}. ${u}`).join("\n");
    }

    const { error: msgErr } = await supabase.from("messages").insert({
      conversation_id: conv.id, sender_type: "client", sender_id: user.id,
      content, screenshot_url: uploadedUrls[0] ?? null,
    });

    if (msgErr) {
      console.error("[support] failed to save first message:", msgErr);
      Sentry.captureException(new Error(`Ticket message save failed: ${msgErr.message}`), {
        tags: { feature: "support" },
        extra: { conversationId: conv.id },
      });
      toast.error("Ticket criado mas a mensagem não foi salva. Nossa equipe vai entrar em contato.");
    } else if (failedUploads.length > 0) {
      toast.warning(`Ticket criado, mas ${failedUploads.length} imagem(ns) não puderam ser anexadas.`);
    } else {
      toast.success("Ticket criado! Responderemos em breve.");
    }

    setTickets(prev => [{
      id: conv.id, subject, category, status: "open",
      date: new Date().toISOString(), messages: msgErr ? 0 : 1,
    }, ...prev]);
    setSubject(""); setDescription(""); setCategory("bug");
    setScreenshots([]); setScreenshotPreviews([]); setCreateOpen(false);
    setSending(false);
  };

  const statusBadge = (s: string) => {
    if (s === "open") return <Badge variant="warning" className="text-[9px]">Aberto</Badge>;
    if (s === "in_progress") return <Badge variant="processing" className="text-[9px]">Em andamento</Badge>;
    return <Badge variant="success" className="text-[9px]">Resolvido</Badge>;
  };

  const catIcon = (c: string) => {
    const cat = CATEGORIES.find(x => x.value === c);
    if (!cat) return <CircleHelp className="w-4 h-4 text-muted-foreground" />;
    return <cat.icon className={`w-4 h-4 ${cat.color}`} />;
  };

  const filteredFaqs = searchFaq
    ? faqs.filter(f => f.q.toLowerCase().includes(searchFaq.toLowerCase()))
    : faqs;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Suporte</h1>
          <p className="text-sm text-muted-foreground mt-1">Reportar bugs, sugerir melhorias ou tirar dúvidas</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(!createOpen)}>
          <Plus className="w-4 h-4" /> Novo ticket
        </Button>
      </motion.div>

      {/* Create ticket */}
      {createOpen && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-sm font-bold">Novo ticket</h3>

              <div className="flex gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      category === c.value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-border-strong"
                    }`}>
                    <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                    {c.label}
                  </button>
                ))}
              </div>

              <Input placeholder="Assunto" value={subject} onChange={e => setSubject(e.target.value)} />
              <Textarea placeholder="Descreva o problema, sugestão ou dúvida em detalhes..." rows={4}
                value={description} onChange={e => setDescription(e.target.value)} />

              {/* Screenshots */}
              <div>
                <input type="file" ref={fileRef} accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                <div className="flex items-center gap-3 flex-wrap">
                  {screenshotPreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removeScreenshot(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center cursor-pointer">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {screenshots.length < 3 && (
                    <button onClick={() => fileRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/30 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">Screenshot</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => { setCreateOpen(false); setScreenshots([]); setScreenshotPreviews([]); }}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-primary" /> Seus tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!loaded ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
              ) : tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum ticket ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {tickets.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {catIcon(t.category)}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.subject}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {t.messages} msg
                          </p>
                        </div>
                      </div>
                      {statusBadge(t.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <HelpCircle className="w-4 h-4 text-primary" /> FAQ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-9 h-8 text-xs" value={searchFaq} onChange={e => setSearchFaq(e.target.value)} />
              </div>
              {filteredFaqs.map((faq, i) => (
                <div key={i} className="border border-border/50 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-muted/20 transition-colors">
                    <span className="text-xs font-medium pr-2">{faq.q}</span>
                    <ChevronRight className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-3 pb-3"><p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p></div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
