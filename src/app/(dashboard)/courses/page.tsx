"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Clock, Calendar, Users, Video, Send,
  Search, Globe, TrendingUp, Eye, ArrowRight,
  MessageCircle, X, ChevronRight, List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { NumberTicker } from "@/components/ui/number-ticker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Replay = {
  id: string;
  title: string;
  video_url: string;
  created_at: string;
  views: number;
};

type Comment = {
  id: string;
  replay_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
  replies?: Reply[];
};

type Reply = {
  id: string;
  comment_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

export default function ClubPage() {
  const [applyOpen, setApplyOpen] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteGoal, setSiteGoal] = useState("");
  const [replays, setReplays] = useState<Replay[]>([]);
  const [nextSession, setNextSession] = useState<any>(null);
  const [selectedReplay, setSelectedReplay] = useState<Replay | null>(null);
  const [stats, setStats] = useState({ analyses: 0, sites: 0, members: 0, hours: 0 });

  // Comentários
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Fetch user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch replays
      const { data: replaysData } = await supabase
        .from("club_replays")
        .select("*")
        .order("created_at", { ascending: false });
      if (replaysData) {
        setReplays(replaysData);
        // Selecionar o primeiro replay
        if (replaysData.length > 0 && !selectedReplay) {
          setSelectedReplay(replaysData[0]);
        }
      }

      // Fetch next session
      let sessionData;
      const { data: futureSessions } = await supabase
        .from("club_sessions")
        .select("*, club_candidates(id, selected)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(1);

      if (futureSessions && futureSessions.length > 0) {
        sessionData = futureSessions;
      } else {
        const { data: lastSession } = await supabase
          .from("club_sessions")
          .select("*, club_candidates(id, selected)")
          .order("scheduled_at", { ascending: false })
          .limit(1);
        sessionData = lastSession;
      }

      if (sessionData && sessionData.length > 0) {
        const s = sessionData[0];
        const d = new Date(s.scheduled_at);
        const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        setNextSession({
          id: s.id,
          date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          dayOfWeek: dayNames[d.getDay()],
          slots: s.club_candidates?.filter((c: any) => c.selected).length || 0,
          maxSlots: s.max_slots || 5,
          candidates: s.club_candidates?.filter((c: any) => c.selected).map((c: any) => ({
            name: c.name || "",
            site: c.site || "",
            niche: c.niche || "",
          })) || [],
        });
      }

      // Fetch stats
      const [{ count: replaysCount }, { count: sitesCount }, { count: membersCount }] = await Promise.all([
        supabase.from("club_replays").select("*", { count: "exact", head: true }),
        supabase.from("club_replays").select("site_analyzed", { count: "exact", head: true }),
        supabase.from("club_candidates").select("*", { count: "exact", head: true }),
      ]);

      const hours = Math.round((replaysCount || 0) * 40 / 60);

      setStats({
        analyses: replaysCount || 0,
        sites: sitesCount || 0,
        members: membersCount || 0,
        hours,
      });
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedReplay) {
      loadComments(selectedReplay.id);
    }
  }, [selectedReplay]);

  async function handleApply() {
    if (!siteUrl.trim() || !siteGoal.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login para se candidatar."); return; }
    const sessionId = nextSession?.id;
    if (!sessionId) { toast.error("Nenhuma sessão disponível."); return; }
    const { error } = await supabase
      .from("club_candidates")
      .insert({ session_id: sessionId, user_id: user.id, client_site_id: siteUrl, goal: siteGoal });
    if (error) { toast.error("Erro ao enviar candidatura."); return; }
    setApplyOpen(false);
    toast.success("Candidatura enviada!");
    setSiteUrl("");
    setSiteGoal("");
  }

  async function loadComments(replayId: string) {
    const supabase = createClient();

    const { data: commentsData } = await supabase
      .from("club_replay_comments")
      .select("*, profiles:user_id(email, name)")
      .eq("replay_id", replayId)
      .order("created_at", { ascending: false });

    if (commentsData) {
      const commentsWithReplies = await Promise.all(
        commentsData.map(async (c: any) => {
          const { data: repliesData } = await supabase
            .from("club_replay_replies")
            .select("*, profiles:user_id(email, name)")
            .eq("comment_id", c.id)
            .order("created_at", { ascending: true });

          return {
            ...c,
            user_email: c.profiles?.email,
            user_name: c.profiles?.name,
            replies: repliesData?.map((r: any) => ({
              ...r,
              user_email: r.profiles?.email,
              user_name: r.profiles?.name,
            })) || [],
          };
        })
      );
      setComments(commentsWithReplies);
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !selectedReplay) return;
    const supabase = createClient();
    const { error } = await supabase.from("club_replay_comments").insert({
      replay_id: selectedReplay.id,
      user_id: currentUser.id,
      content: newComment.trim(),
    });
    if (error) {
      toast.error("Erro ao adicionar comentário");
      return;
    }
    toast.success("Comentário adicionado!");
    setNewComment("");
    loadComments(selectedReplay.id);
  }

  async function handleAddReply() {
    if (!replyContent.trim() || !replyingTo) return;
    const supabase = createClient();
    const { error } = await supabase.from("club_replay_replies").insert({
      comment_id: replyingTo,
      user_id: currentUser.id,
      content: replyContent.trim(),
    });
    if (error) {
      toast.error("Erro ao adicionar resposta");
      return;
    }
    toast.success("Resposta adicionada!");
    setReplyContent("");
    setReplyingTo(null);
    loadComments(selectedReplay!.id);
  }

  function getUserDisplayName(comment: { user_name?: string; user_email?: string }) {
    return comment.user_name || comment.user_email?.split('@')[0] || "Anônimo";
  }

  function formatReplayDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Club</h1>
          <p className="page-description">Análises semanais ao vivo dos projetos dos membros</p>
        </div>
        <Button onClick={() => setApplyOpen(true)}>
          <Send className="w-4 h-4" /> Candidatar meu site
        </Button>
      </motion.div>

      {/* Next session card */}
      {nextSession && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="card-beam relative overflow-hidden">
            <CardContent className="p-6">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
              <div className="flex items-start justify-between relative">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wider font-mono">Próxima sessão ao vivo</span>
                  </div>
                  <h2 className="text-xl font-black font-[family-name:var(--font-display)] tracking-tight mb-1">
                    {nextSession.dayOfWeek}, {nextSession.date}
                  </h2>
                  <p className="text-sm text-muted-foreground">às {nextSession.time} • Duração: ~45 min</p>

                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="outline" className="font-mono text-xs">
                      <Users className="w-3 h-3 mr-1" /> {nextSession.slots}/{nextSession.maxSlots} vagas
                    </Badge>
                    <Badge variant="success" className="text-xs">Vagas abertas</Badge>
                  </div>
                </div>

                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono mb-3">Sites selecionados</p>
                  <div className="space-y-2">
                    {nextSession.candidates.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <Avatar size="sm"><AvatarFallback>{c.name.split(" ").map((n: string) => n[0]).join("")}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-xs font-semibold">{c.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">{c.site} • {c.niche}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer ter seu site analisado ao vivo pela nossa equipe?
                </p>
                <Button onClick={() => setApplyOpen(true)}>
                  <Send className="w-4 h-4" /> Me candidatar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Análises feitas", value: stats.analyses, icon: Video },
          { label: "Sites analisados", value: stats.sites, icon: Globe },
          { label: "Membros ativos", value: stats.members, icon: Users },
          { label: "Horas de conteúdo", value: stats.hours, icon: Clock },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{s.label}</span>
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
              <NumberTicker value={s.value} />
            </p>
          </Card>
        ))}
      </motion.div>

      {/* Video Player Area */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex gap-6">
          {/* Sidebar com lista de aulas */}
          <div className={cn(
            "transition-all duration-300",
            sidebarOpen ? "w-80" : "w-0"
          )}>
            {sidebarOpen && (
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold font-[family-name:var(--font-display)] tracking-tight">
                      Todas as aulas ({replays.length})
                    </h2>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input placeholder="Buscar aula..." className="pl-7 h-8 text-xs" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-1 p-2">
                      {replays.map((replay) => (
                        <button
                          key={replay.id}
                          onClick={() => setSelectedReplay(replay)}
                          className={cn(
                            "w-full p-3 rounded-lg text-left transition-colors flex gap-3 items-start group",
                            selectedReplay?.id === replay.id
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded flex items-center justify-center shrink-0",
                            selectedReplay?.id === replay.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                          )}>
                            {selectedReplay?.id === replay.id ? (
                              <Play className="w-4 h-4 fill-current" />
                            ) : (
                              <span className="text-xs font-bold">{replay.title.split(' ')[1]}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              selectedReplay?.id === replay.id ? "text-primary" : ""
                            )}>
                              {replay.title}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {formatReplayDate(replay.created_at)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Área principal */}
          <div className="flex-1 min-w-0">
            {/* Botão para abrir sidebar */}
            {!sidebarOpen && (
              <Button variant="outline" size="sm" className="mb-4" onClick={() => setSidebarOpen(true)}>
                <List className="w-4 h-4 mr-2" />
                Mostrar aulas
              </Button>
            )}

            {selectedReplay ? (
              <>
                {/* Video */}
                <Card className="mb-6 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-black">
                      {selectedReplay.video_url ? (
                        <video
                          src={selectedReplay.video_url}
                          className="w-full h-full"
                          controls
                          autoPlay
                          playsInline
                          preload="metadata"
                        >
                          <source src={selectedReplay.video_url} type="video/mp4" />
                          Seu navegador não suporta reprodução de vídeos.
                        </video>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Vídeo não disponível</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Info + Comentários */}
                <div className="space-y-6">
                  {/* Info do vídeo */}
                  <div>
                    <h2 className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight mb-2">
                      {selectedReplay.title}
                    </h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedReplay.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {selectedReplay.views || 0} visualizações
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Comentários */}
                  <div>
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Comentários ({comments.length})
                    </h3>

                    {currentUser ? (
                      <div className="mb-6 space-y-2">
                        <Textarea
                          placeholder="Adicione um comentário..."
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                        />
                        <Button onClick={handleAddComment} size="sm">
                          <Send className="w-3.5 h-3.5 mr-1" /> Comentar
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mb-6">Faça login para comentar</p>
                    )}

                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">Seja o primeiro a comentar!</p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment.id} className="space-y-3">
                              <div className="flex gap-3">
                                <Avatar size="sm">
                                  <AvatarFallback className="text-xs">
                                    {getUserDisplayName(comment).slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{getUserDisplayName(comment)}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs mt-1"
                                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  >
                                    Responder
                                  </Button>
                                </div>
                              </div>

                              {replyingTo === comment.id && (
                                <div className="ml-12 space-y-2">
                                  <Textarea
                                    placeholder="Sua resposta..."
                                    rows={2}
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={handleAddReply}>
                                      <Send className="w-3.5 h-3.5 mr-1" /> Responder
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setReplyContent(""); }}>
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {comment.replies && comment.replies.length > 0 && (
                                <div className="ml-12 space-y-3 mt-3 border-l-2 border-border pl-4">
                                  {comment.replies.map((reply) => (
                                    <div key={reply.id} className="flex gap-3">
                                      <Avatar size="sm">
                                        <AvatarFallback className="text-xs">
                                          {getUserDisplayName(reply).slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-semibold">{getUserDisplayName(reply)}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {new Date(reply.created_at).toLocaleDateString("pt-BR")}
                                          </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{reply.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            ) : (
              <Card className="p-12 text-center">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Selecione uma aula</h3>
                <p className="text-sm text-muted-foreground">Escolha uma aula na lista ao lado para começar a assistir</p>
              </Card>
            )}
          </div>
        </div>
      </motion.div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Candidatar meu site para análise</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo. Nossa equipe selecionará até 5 sites por sessão. Você será notificado se for escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do site</Label>
              <Input placeholder="https://meusite.com.br" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>O que você quer melhorar?</Label>
              <Textarea
                placeholder="Ex: quero mais tráfego orgânico, não sei se meus backlinks estão funcionando..."
                rows={4}
                value={siteGoal}
                onChange={(e) => setSiteGoal(e.target.value)}
              />
            </div>
            <div className="bg-primary-light rounded-xl p-4 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Como funciona:</span> A análise é feita ao vivo pela nossa equipe.
                Vamos revisar seu site, backlinks, keywords, conteúdo, e dar recomendações práticas.
                A gravação fica disponível nos replays para todos os membros.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancelar</Button>
            <Button onClick={handleApply}>
              <Send className="w-4 h-4" /> Enviar candidatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
