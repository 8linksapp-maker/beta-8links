"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { useSite } from "@/lib/hooks/use-site";
import {
  FileText, Search, ExternalLink, Trash2, Clock, Sparkles,
  Plus, Eye, PenLine, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";

export default function ArticlesPage() {
  const router = useRouter();
  const { activeSiteId, loading: siteLoading } = useSite();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [customKeyword, setCustomKeyword] = useState("");
  const [planKeywords, setPlanKeywords] = useState<any[]>([]);
  const [kwSearch, setKwSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (siteLoading || !activeSiteId) { setLoaded(true); return; }

    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("client_site_id", activeSiteId)
        .order("created_at", { ascending: false });

      setArticles((data ?? []).map(a => ({
        id: a.id,
        title: a.title ?? "Sem título",
        keyword: a.keyword,
        wordCount: a.word_count ?? 0,
        status: a.status ?? "draft",
        publishedUrl: a.published_url,
        createdAt: a.created_at,
      })));
      setLoaded(true);
    }
    load();
  }, [activeSiteId, siteLoading]);

  // Load plan keywords when modal opens
  useEffect(() => {
    if (!createOpen || !activeSiteId) return;
    async function loadKw() {
      const supabase = createClient();
      const { data } = await supabase
        .from("keywords")
        .select("keyword, search_volume, difficulty")
        .eq("client_site_id", activeSiteId)
        .eq("source", "dataforseo")
        .order("search_volume", { ascending: false })
        .limit(50);
      setPlanKeywords(data ?? []);
    }
    loadKw();
  }, [createOpen, activeSiteId]);

  const handleCreate = () => {
    const kw = newKeyword || customKeyword;
    if (!kw.trim()) return;
    setCreateOpen(false);
    setNewKeyword("");
    setCustomKeyword("");
    router.push(`/articles/write?keyword=${encodeURIComponent(kw.trim())}`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    await supabase.from("articles").delete().eq("id", deleteId);
    setArticles(prev => prev.filter(a => a.id !== deleteId));
    setDeleteId(null);
    toast.success("Artigo removido");
  };

  // Stats
  const total = articles.length;
  const drafts = articles.filter(a => a.status === "draft").length;
  const published = articles.filter(a => a.status === "published").length;
  const totalWords = articles.reduce((s, a) => s + (a.wordCount ?? 0), 0);

  // Filter
  const filtered = articles
    .filter(a => filter === "all" || a.status === filter)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.keyword?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)] tracking-tight">Artigos IA</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie conteúdo otimizado para o seu site</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Criar Artigo
        </Button>
      </motion.div>

      {/* KPIs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total" value={total} icon={FileText} />
        <MetricCard label="Rascunhos" value={drafts} icon={Clock} />
        <MetricCard label="Publicados" value={published} icon={CheckCircle2} />
        <MetricCard label="Palavras escritas" value={totalWords} icon={PenLine} />
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {[
            { id: "all", label: "Todos" },
            { id: "draft", label: "Rascunhos" },
            { id: "published", label: "Publicados" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Buscar artigo..." className="pl-9 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </motion.div>

      {/* Articles list */}
      {!loaded ? (
        <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : articles.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum artigo"
          description="Crie seu primeiro artigo com IA — basta digitar uma keyword"
          action={{ label: "Criar Artigo", onClick: () => setCreateOpen(true) }} />
      ) : (
        <div className="space-y-2">
          {filtered.map((article, i) => (
            <motion.div key={article.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.03 }}>
              <Card className="hover:border-border-strong transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status indicator */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      article.status === "published" ? "bg-success/10" : "bg-muted/50"
                    }`}>
                      {article.status === "published" ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : article.wordCount > 0 ? (
                        <FileText className="w-5 h-5 text-primary" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate">{article.title}</h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{article.keyword}</Badge>
                        {article.wordCount > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground">{article.wordCount.toLocaleString()} palavras</span>
                        )}
                        <span className={`text-[10px] font-semibold ${article.status === "published" ? "text-success" : "text-muted-foreground"}`}>
                          {article.status === "published" ? "Publicado" : article.wordCount > 0 ? "Rascunho" : "Pendente"}
                        </span>
                        {article.publishedUrl && (
                          <a href={article.publishedUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[9px] font-mono text-primary hover:underline flex items-center gap-0.5">
                            <ExternalLink className="w-2 h-2" /> Ver
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {article.wordCount === 0 ? (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                          onClick={() => router.push(`/articles/write?keyword=${encodeURIComponent(article.keyword)}`)}>
                          <Sparkles className="w-3 h-3" /> Gerar com IA
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                          onClick={() => router.push(`/articles/${article.id}/edit`)}>
                          <Eye className="w-3 h-3" /> {article.status === "draft" ? "Editar" : "Ver"}
                        </Button>
                      )}
                      <button onClick={() => setDeleteId(article.id)}
                        className="text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer p-1.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) { setNewKeyword(""); setCustomKeyword(""); setKwSearch(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Artigo com IA</DialogTitle>
            <DialogDescription>Escolha uma keyword do seu plano ou digite uma nova.</DialogDescription>
          </DialogHeader>

          {planKeywords.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">Keywords do seu plano</Label>
              {planKeywords.length > 5 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input placeholder="Filtrar..." className="pl-8 h-7 text-xs" value={kwSearch} onChange={e => setKwSearch(e.target.value)} />
                </div>
              )}
              <div className="max-h-[200px] overflow-y-auto space-y-0.5 border border-border rounded-lg p-1">
                {planKeywords
                  .filter(k => !kwSearch || k.keyword.toLowerCase().includes(kwSearch.toLowerCase()))
                  .map((k, i) => (
                    <button key={i} onClick={() => { setNewKeyword(k.keyword); setCustomKeyword(""); }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-xs transition-colors cursor-pointer ${
                        newKeyword === k.keyword ? "bg-primary/10 text-foreground" : "hover:bg-muted/50 text-muted-foreground"
                      }`}>
                      <span className={newKeyword === k.keyword ? "font-semibold text-foreground" : ""}>{k.keyword}</span>
                      <span className="font-mono text-[10px] shrink-0 ml-2">
                        {k.search_volume?.toLocaleString() ?? 0} <span className="text-muted-foreground/50">vol</span>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">
              {planKeywords.length > 0 ? "Ou digite uma keyword" : "Keyword"}
            </Label>
            <Input placeholder="ex: como montar loja virtual" value={customKeyword}
              onChange={e => { setCustomKeyword(e.target.value); setNewKeyword(""); }}
              onKeyDown={e => e.key === "Enter" && handleCreate()} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newKeyword && !customKeyword.trim()} className="gap-2">
              <Sparkles className="w-4 h-4" /> Gerar Artigo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir Artigo</DialogTitle>
            <DialogDescription>Essa ação é irreversível. O artigo será removido permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
