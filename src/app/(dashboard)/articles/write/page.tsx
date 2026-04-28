"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Copy, Check, Download,
  Sparkles, Save,
  Bold, Italic, Heading2, Heading3, Type, LinkIcon, List,
  Undo2, Redo2, Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSite } from "@/lib/hooks/use-site";
import { createClient } from "@/lib/supabase/client";

type Step = "idle" | "serp" | "outline" | "writing" | "images" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "Preparando...", serp: "Analisando concorrentes no Google",
  outline: "Criando estrutura do artigo", writing: "Escrevendo o artigo com IA",
  images: "Buscando imagens", done: "Artigo pronto!", error: "Erro na geração",
};
const STEP_ORDER: Step[] = ["serp", "outline", "writing", "images", "done"];

export default function WriteArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const keywordId = searchParams.get("keywordId") ?? "";
  const { activeSiteId, activeSite } = useSite();

  const [step, setStep] = useState<Step>("idle");
  const [outline, setOutline] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor
  const editorRef = useRef<HTMLDivElement>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // ═════════════════════════════════════════════════════
  // GENERATE
  // ═════════════════════════════════════════════════════
  useEffect(() => {
    if (!keyword || step !== "idle") return;
    generateArticle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  const generateArticle = async () => {
    if (!keyword) return;
    setStep("serp"); setEditorReady(false);

    try {
      const t1 = setTimeout(() => setStep("outline"), 6000);
      const t2 = setTimeout(() => setStep("writing"), 14000);
      const t3 = setTimeout(() => setStep("images"), 30000);

      const res = await fetch("/api/admin/test-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, model: "gpt-4.1-mini", siteContext: activeSite?.niche_primary ?? "" }),
      });
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);

      const data = await res.json();
      if (data.error) { setStep("error"); toast.error(data.error); return; }

      setOutline(data.outline ?? null);
      setStats(data.stats ?? null);

      const html = markdownToHtml(data.article ?? "");
      setStep("done");

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
          setEditorReady(true);
          updateWordCount();
        }
      }, 100);

      if (activeSiteId && data.article) saveArticle(data);
    } catch {
      setStep("error");
      toast.error("Erro ao gerar artigo");
    }
  };

  const saveArticle = async (data: any) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !activeSiteId) return;

    const { data: inserted } = await supabase.from("articles").insert({
      user_id: user.id, client_site_id: activeSiteId, keyword,
      title: data.outline?.title ?? keyword, content: data.article,
      meta_description: data.outline?.metaDescription ?? "",
      word_count: data.stats?.wordCount ?? 0,
      serp_analysis: data.competitorOutlines ?? null,
      nlp_terms: data.nlpTerms ?? null, status: "draft",
    }).select("id").single();

    if (inserted) {
      setSavedId(inserted.id);
      if (keywordId) {
        await supabase.from("keywords")
          .update({ content_status: "escrevendo", article_url: `/articles/${inserted.id}/edit` })
          .eq("id", keywordId);
      }
      toast.success("Rascunho salvo");
    }
  };

  const saveCurrentContent = async () => {
    if (!savedId || !editorRef.current) return;
    setSaving(true);
    const supabase = createClient();
    const wc = getWordCount(editorRef.current);
    await supabase.from("articles").update({
      content: editorRef.current.innerHTML, word_count: wc,
    }).eq("id", savedId);
    toast.success("Salvo!");
    setSaving(false);
  };

  const updateWordCount = () => {
    if (!editorRef.current) return;
    setWordCount(getWordCount(editorRef.current));
  };

  // Toolbar
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    setTimeout(updateWordCount, 30);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(editorRef.current?.innerHTML ?? "");
    setCopied(true); toast.success("HTML copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${keyword.replace(/\s+/g, "-").slice(0, 50)}.txt`;
    a.click();
  };

  const isGenerating = !["idle", "done", "error"].includes(step);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/articles")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-[family-name:var(--font-display)] tracking-tight truncate">
            {outline?.title ?? keyword}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Keyword: <span className="text-foreground font-semibold">{keyword}</span>
            {stats && <span className="ml-3 text-muted-foreground/60">({stats.totalDuration} · {stats.cost})</span>}
          </p>
        </div>
        {step === "done" && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={downloadMarkdown}>
              <Download className="w-3 h-3" /> Baixar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={copyContent}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copiado!" : "Copiar"}
            </Button>
            {savedId && (
              <Button size="sm" className="gap-1.5 text-xs h-8" onClick={saveCurrentContent} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      {isGenerating && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-bold">{STEP_LABELS[step]}</p>
                  <p className="text-[11px] text-muted-foreground">Isso pode levar 1-2 minutos</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {STEP_ORDER.map((s, i) => {
                  const idx = STEP_ORDER.indexOf(step);
                  const done = STEP_ORDER.indexOf(s) < idx;
                  const active = s === step;
                  return (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${done ? "bg-success text-white" : active ? "bg-primary text-white animate-pulse" : "bg-muted text-muted-foreground"}`}>
                        {done ? <Check className="w-3 h-3" /> : i + 1}
                      </div>
                      {i < STEP_ORDER.length - 1 && <div className={`h-0.5 flex-1 rounded ${done ? "bg-success" : "bg-muted"}`} />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {step === "error" && (
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-destructive font-semibold mb-3">Erro ao gerar o artigo</p>
            <Button onClick={generateArticle} className="gap-2"><Sparkles className="w-4 h-4" /> Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* EDITOR                                          */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {step === "done" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-3 py-2 bg-card border border-border rounded-t-xl border-b-0 flex-wrap">
            <TBtn icon={Undo2} label="Desfazer" onClick={() => exec("undo")} />
            <TBtn icon={Redo2} label="Refazer" onClick={() => exec("redo")} />
            <Sep />
            <TBtn icon={Bold} label="Negrito" onClick={() => exec("bold")} />
            <TBtn icon={Italic} label="Itálico" onClick={() => exec("italic")} />
            <Sep />
            <TBtn icon={Heading2} label="H2" onClick={() => exec("formatBlock", "h2")} />
            <TBtn icon={Heading3} label="H3" onClick={() => exec("formatBlock", "h3")} />
            <TBtn icon={Type} label="Parágrafo" onClick={() => exec("formatBlock", "p")} />
            <Sep />
            <TBtn icon={List} label="Lista" onClick={() => exec("insertUnorderedList")} />
            <TBtn icon={LinkIcon} label="Link" onClick={() => { const u = prompt("URL:"); if (u) exec("createLink", u); }} />
            <TBtn icon={ImageIcon} label="Imagem" onClick={() => { const u = prompt("URL da imagem:"); if (u) exec("insertImage", u); }} />
            <div className="ml-auto text-[10px] font-mono text-muted-foreground">
              {wordCount.toLocaleString()} palavras
            </div>
          </div>

          {/* Content area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => requestAnimationFrame(updateWordCount)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveCurrentContent(); } }}
            className="min-h-[75vh] max-h-[85vh] p-8 bg-card border border-border rounded-b-xl
              focus:outline-none overflow-y-auto leading-relaxed
              [&>h1]:text-2xl [&>h1]:font-black [&>h1]:mb-6 [&>h1]:mt-2 [&>h1]:text-foreground [&>h1]:font-[family-name:var(--font-display)]
              [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:text-foreground [&>h2]:font-[family-name:var(--font-display)] [&>h2]:border-b [&>h2]:border-border/30 [&>h2]:pb-2
              [&>h3]:text-base [&>h3]:font-semibold [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:text-foreground/90
              [&>p]:text-[14px] [&>p]:leading-[1.85] [&>p]:text-muted-foreground [&>p]:mb-4 [&>p]:max-w-[680px]
              [&>ul]:my-3 [&>ul]:pl-6 [&>ul]:space-y-1 [&_li]:text-[14px] [&_li]:leading-relaxed [&_li]:text-muted-foreground
              [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:italic [&_em]:text-foreground/80
              [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
              [&_img]:rounded-xl [&_img]:my-6 [&_img]:max-w-full [&_img]:shadow-lg"
          />
        </motion.div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────
function TBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
function Sep() { return <div className="w-px h-4 bg-border mx-0.5" />; }

function getWordCount(el: HTMLElement): number {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("img").forEach(img => img.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─── Markdown → HTML ────────────────────────────────
function markdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/);
  const htmlParts: string[] = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n").map(l => l.trimEnd());

    if (lines.length === 1 && lines[0].startsWith("#")) {
      const l = lines[0];
      if (l.startsWith("### ")) { htmlParts.push(`<h3>${inl(l.slice(4))}</h3>`); continue; }
      if (l.startsWith("## "))  { htmlParts.push(`<h2>${inl(l.slice(3))}</h2>`);  continue; }
      if (l.startsWith("# "))   { htmlParts.push(`<h1>${inl(l.slice(2))}</h1>`);  continue; }
    }

    if (lines.length === 1) {
      const m = lines[0].match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) { htmlParts.push(`<img src="${m[2]}" alt="${m[1]}" />`); continue; }
    }

    if (lines.length === 1 && lines[0].startsWith("*") && lines[0].endsWith("*") && lines[0].length < 120) {
      htmlParts.push(`<p><em style="font-size:11px;opacity:0.5">${lines[0].slice(1, -1)}</em></p>`);
      continue;
    }

    if (lines.every(l => l.startsWith("- ") || !l.trim())) {
      htmlParts.push("<ul>");
      for (const l of lines) { if (l.startsWith("- ")) htmlParts.push(`<li>${inl(l.slice(2))}</li>`); }
      htmlParts.push("</ul>");
      continue;
    }

    if (lines[0].startsWith("#")) {
      const h = lines[0];
      if (h.startsWith("### ")) htmlParts.push(`<h3>${inl(h.slice(4))}</h3>`);
      else if (h.startsWith("## ")) htmlParts.push(`<h2>${inl(h.slice(3))}</h2>`);
      else htmlParts.push(`<h1>${inl(h.slice(2))}</h1>`);
      const rest = lines.slice(1).filter(l => l.trim()).map(l => inl(l)).join(" ");
      if (rest) htmlParts.push(`<p>${rest}</p>`);
      continue;
    }

    const textLines: string[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) {
        if (textLines.length) { htmlParts.push(`<p>${textLines.join(" ")}</p>`); textLines.length = 0; }
        htmlParts.push(`<img src="${m[2]}" alt="${m[1]}" />`);
      } else { textLines.push(inl(line)); }
    }
    if (textLines.length) htmlParts.push(`<p>${textLines.join(" ")}</p>`);
  }

  return htmlParts.join("\n");
}

function inl(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
