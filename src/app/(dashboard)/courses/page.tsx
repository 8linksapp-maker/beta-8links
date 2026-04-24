"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Clock, Calendar, Users, Video, Send,
  CheckCircle2, ArrowRight, Search, Globe, TrendingUp,
  Star, Eye, ChevronRight, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const mockReplays = [
  { id: 1, title: "Análise: E-commerce de Roupas Fitness", site: "fitstore.com.br", niche: "Fitness", date: "07 Abr 2026", duration: "42min", views: 234, highlights: ["DA subiu 15 pontos em 3 meses", "Backlinks de nicho esportivo", "Artigos com 2.000+ palavras rankeando"] },
  { id: 2, title: "Análise: Clínica Odontológica SP", site: "sorrisosp.com.br", niche: "Saúde", date: "31 Mar 2026", duration: "38min", views: 189, highlights: ["SEO local + backlinks nacionais", "Keywords de alta intenção", "Schema markup para clínicas"] },
  { id: 3, title: "Análise: Blog de Receitas Veganas", site: "receitasveg.com", niche: "Culinária", date: "24 Mar 2026", duration: "45min", views: 312, highlights: ["Topical authority em receitas", "Pinterest como fonte de tráfego", "Featured snippets para receitas"] },
  { id: 4, title: "Análise: Loja de Peças Automotivas", site: "autopecas.com.br", niche: "Automotivo", date: "17 Mar 2026", duration: "35min", views: 156, highlights: ["E-commerce SEO técnico", "Categorias otimizadas", "Links de portais automotivos"] },
  { id: 5, title: "Análise: Escritório de Advocacia", site: "advocaciasilva.com.br", niche: "Jurídico", date: "10 Mar 2026", duration: "40min", views: 198, highlights: ["Conteúdo YMYL", "Autoridade do autor", "Links de portais jurídicos"] },
  { id: 6, title: "Análise: Pet Shop Online", site: "meupetshop.com.br", niche: "Pets", date: "03 Mar 2026", duration: "37min", views: 267, highlights: ["Nicho de alta competição", "Estratégia de long tail", "Conteúdo educativo sobre pets"] },
];

const mockNextSession = {
  date: "14 Abr 2026",
  time: "20:00",
  dayOfWeek: "Segunda-feira",
  slots: 3,
  maxSlots: 5,
  candidates: [
    { name: "Maria Santos", site: "floricultura.com", niche: "Jardinagem" },
    { name: "Pedro Lima", site: "techstart.io", niche: "Startups" },
    { name: "Ana Costa", site: "yogazen.com.br", niche: "Saúde" },
  ],
};

export default function ClubPage() {
  const [applyOpen, setApplyOpen] = useState(false);
  const [searchReplay, setSearchReplay] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [siteGoal, setSiteGoal] = useState("");
  const [dbReplays, setDbReplays] = useState<any[]>([]);
  const [dbNextSession, setDbNextSession] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch replays
      const { data: replaysData } = await supabase
        .from("club_replays")
        .select("*")
        .order("created_at", { ascending: false });
      if (replaysData && replaysData.length > 0) {
        setDbReplays(replaysData.map((r: any) => ({
          id: r.id,
          title: r.title,
          site: r.site || "",
          niche: r.niche || "",
          date: new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          duration: r.duration || "",
          views: r.views || 0,
          highlights: r.highlights || [],
        })));
      }

      // Fetch next session
      const { data: sessionData } = await supabase
        .from("club_sessions")
        .select("*, club_candidates(id, selected)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(1);
      if (sessionData && sessionData.length > 0) {
        const s = sessionData[0];
        const d = new Date(s.scheduled_at);
        const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        setDbNextSession({
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
    }
    load();
  }, []);

  const replays = dbReplays.length > 0 ? dbReplays : mockReplays;
  const nextSession = dbNextSession || mockNextSession;

  async function handleApply() {
    if (!siteUrl.trim() || !siteGoal.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Faça login para se candidatar."); return; }
    const sessionId = dbNextSession?.id;
    if (!sessionId) { toast.error("Nenhuma sessão disponível."); return; }
    const { error } = await supabase
      .from("club_candidates")
      .insert({ session_id: sessionId, user_id: user.id, client_site_id: siteUrl, goal: siteGoal });
    if (error) { toast.error("Erro ao enviar candidatura."); return; }
    setApplyOpen(false);
    toast.success("Candidatura enviada!", { description: "Você será notificado se for selecionado." });
    setSiteUrl("");
    setSiteGoal("");
  }

  const filteredReplays = searchReplay
    ? replays.filter((r: any) =>
        r.title.toLowerCase().includes(searchReplay.toLowerCase()) ||
        r.niche.toLowerCase().includes(searchReplay.toLowerCase()) ||
        r.site.toLowerCase().includes(searchReplay.toLowerCase())
      )
    : replays;

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

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Análises feitas", value: 48, icon: Video },
          { label: "Sites analisados", value: 48, icon: Globe },
          { label: "Membros ativos", value: 312, icon: Users },
          { label: "Horas de conteúdo", value: 32, icon: Clock },
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

      {/* Replays */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-[family-name:var(--font-display)] tracking-tight">Replays</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nicho, site..." className="pl-9 w-64 h-8 text-xs" value={searchReplay} onChange={(e) => setSearchReplay(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReplays.map((replay, i) => (
            <motion.div
              key={replay.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.05 }}
            >
              <Card className="card-interactive h-full flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  {/* Thumbnail placeholder */}
                  <div className="relative rounded-lg bg-muted/50 h-36 flex items-center justify-center mb-4 group cursor-pointer overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center z-10 group-hover:scale-110 transition-transform shadow-[0_0_24px_hsl(24_100%_55%/0.3)]">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                    <div className="absolute bottom-2 right-2 z-10">
                      <Badge variant="outline" className="bg-black/60 text-white border-white/20 text-[10px] font-mono">{replay.duration}</Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 z-10">
                      <Badge variant="outline" className="bg-black/60 text-white border-white/20 text-[10px]">{replay.niche}</Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-sm font-bold mb-1 line-clamp-2">{replay.title}</h3>
                  <p className="text-xs font-mono text-muted-foreground mb-3">{replay.site} • {replay.date}</p>

                  {/* Highlights */}
                  <div className="space-y-1.5 mb-4 flex-1">
                    {replay.highlights.map((h: string, j: number) => (
                      <div key={j} className="flex items-start gap-2">
                        <Star className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <span className="text-xs text-muted-foreground">{h}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" /> {replay.views} views</span>
                    <Button variant="ghost" size="sm" className="gap-1 text-primary">
                      Assistir <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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
                placeholder="Ex: quero mais tráfego orgânico, não sei se meus backlinks estão funcionando, quero ranquear para 'melhor notebook'..."
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
