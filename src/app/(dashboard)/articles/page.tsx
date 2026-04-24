"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import {
  FileText, Search, ExternalLink,
  Eye, Edit3, Trash2, TrendingUp, CheckCircle2, Clock,
  Sparkles, ArrowRight, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { StatusTag } from "@/components/ui/status-tag";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

const scoreBg = (s: number) => s >= 80 ? "bg-success-light ring-success/20" : s >= 60 ? "bg-warning-light ring-warning/20" : s > 0 ? "bg-primary-light ring-primary/20" : "bg-muted ring-border";
const scoreColor = (s: number) => s >= 80 ? "text-success" : s >= 60 ? "text-warning" : s > 0 ? "text-primary" : "text-muted-foreground";

export default function ArticlesPage() {
  const { activeSiteId, loading: siteLoading } = useSite();
  const [filter, setFilter] = useState("all");
  const [dbArticles, setDbArticles] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newArticleKeyword, setNewArticleKeyword] = useState("");
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);

  useEffect(() => {
    if (siteLoading || !activeSiteId) return;

    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("articles").select("*").eq("client_site_id", activeSiteId).order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setDbArticles(data.map(a => ({
          id: a.id, title: a.title ?? "Sem título", keyword: a.keyword,
          wordCount: a.word_count, contentScore: a.content_score,
          status: a.status === "published" ? "published" : "draft",
          wpUrl: a.published_url, backlinks: 0, position: null, traffic: 0,
          publishedAt: a.published_at ? new Date(a.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null,
        })));
      }
    }
    load();
  }, [activeSiteId, siteLoading]);

  async function handleCreateArticle() {
    if (!newArticleKeyword.trim()) return;
    if (!activeSiteId) { toast.error("Nenhum site selecionado"); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); return; }

    const { data, error } = await supabase.from("articles").insert({
      user_id: user.id,
      client_site_id: activeSiteId,
      keyword: newArticleKeyword.trim(),
      status: "draft",
      word_count: 0,
      content_score: 0,
      credits_used: 10,
    }).select().single();

    if (error) { toast.error("Erro ao criar artigo"); return; }

    setDbArticles((prev) => [
      {
        id: data.id, title: data.title ?? "Sem título", keyword: data.keyword,
        wordCount: 0, contentScore: 0, status: "draft",
        wpUrl: null, backlinks: 0, position: null, traffic: 0, publishedAt: null,
      },
      ...prev,
    ]);
    toast.success("Artigo criado com sucesso!");
    setNewArticleKeyword("");
    setCreateOpen(false);
  }

  async function handleDeleteArticle() {
    if (!deleteArticleId) return;
    const supabase = createClient();
    const { error } = await supabase.from("articles").delete().eq("id", deleteArticleId);
    if (error) { toast.error("Erro ao deletar artigo"); return; }

    setDbArticles((prev) => prev.filter((a) => a.id !== deleteArticleId));
    toast.success("Artigo removido com sucesso!");
    setDeleteArticleId(null);
  }

  const articles = dbArticles;
  const filtered = filter === "all" ? articles : articles.filter((a: any) => filter === "published" ? a.status === "published" : a.status === "draft");

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Artigos IA</h1>
          <p className="page-description">Crie conteúdo otimizado com inteligência artificial</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Sparkles className="w-4 h-4" /> Criar Artigo</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total", value: 4, icon: FileText },
          { label: "Publicados", value: 2, icon: CheckCircle2 },
          { label: "Score Médio", value: 78, icon: TrendingUp, suffix: "/100" },
          { label: "Tráfego", value: 520, icon: Eye, suffix: " vis" },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">{s.label}</span>
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
              <NumberTicker value={s.value} />{s.suffix && <span className="text-sm text-muted-foreground">{s.suffix}</span>}
            </p>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center justify-between">
        <div className="flex gap-2">
          {[{ id: "all", label: "Todos" }, { id: "published", label: "Publicados" }, { id: "draft", label: "Rascunhos" }].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 w-56 h-8 text-xs" />
        </div>
      </motion.div>

      {articles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum artigo"
          description="Crie seu primeiro artigo com IA"
          action={{ label: "Criar Artigo", onClick: () => setCreateOpen(true) }}
        />
      ) : (
      <div className="space-y-4">
        {filtered.map((article, i) => (
          <motion.div key={article.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05 }}>
            <Card className="card-interactive overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-5">
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ring-1 shrink-0 ${scoreBg(article.contentScore)}`}>
                    {article.contentScore > 0 ? (
                      <><span className={`text-lg font-black font-[family-name:var(--font-display)] ${scoreColor(article.contentScore)}`}>{article.contentScore}</span><span className="text-[8px] text-muted-foreground font-mono uppercase">Score</span></>
                    ) : (
                      <><Clock className="w-5 h-5 text-muted-foreground" /><span className="text-[8px] text-muted-foreground font-mono">Draft</span></>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold truncate">{article.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="outline" className="text-[10px]">{article.keyword}</Badge>
                          {article.wordCount > 0 && <span className="text-xs font-mono text-muted-foreground">{article.wordCount.toLocaleString()} palavras</span>}
                          <StatusTag status={article.status === "published" ? "completed" : "pending"} label={article.status === "published" ? "Publicado" : "Rascunho"} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit3 className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteArticleId(article.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    {article.status === "published" && (
                      <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Posição:</span><span className={`text-xs font-bold font-mono ${article.position && article.position <= 10 ? 'text-success' : ''}`}>#{article.position}</span></div>
                        <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tráfego:</span><span className="text-xs font-bold font-mono">{article.traffic}</span></div>
                        <div className="flex items-center gap-1.5"><span className="text-xs text-muted-foreground">Backlinks:</span><span className="text-xs font-bold font-mono text-primary">{article.backlinks}</span></div>
                        <div className="flex items-center gap-1.5 ml-auto"><ExternalLink className="w-3 h-3 text-muted-foreground" /><span className="text-xs font-mono text-muted-foreground truncate max-w-36">{article.wpUrl}</span></div>
                      </div>
                    )}
                    {article.status === "draft" && article.wordCount === 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Button size="sm" variant="outline"><Sparkles className="w-3.5 h-3.5 text-primary" /> Gerar com IA <ArrowRight className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                    {article.status === "draft" && article.wordCount > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Content Score:</span><div className="w-24"><Progress value={article.contentScore} variant={article.contentScore >= 80 ? "success" : "warning"} /></div><span className="text-xs font-mono font-semibold">{article.contentScore}/100</span></div>
                        <Button size="sm">Publicar <ArrowRight className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      )}

      {/* Create Article Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Artigo</DialogTitle>
            <DialogDescription>
              Informe a keyword principal para gerar o artigo com IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="article-keyword">Keyword</Label>
            <Input
              id="article-keyword"
              placeholder="Ex: melhor notebook gamer 2026"
              value={newArticleKeyword}
              onChange={(e) => setNewArticleKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateArticle()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateArticle}>
              <Sparkles className="w-4 h-4" /> Criar com IA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Article Confirmation Dialog */}
      <Dialog open={!!deleteArticleId} onOpenChange={(open) => !open && setDeleteArticleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Artigo</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este artigo? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteArticleId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteArticle}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
