"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft, Bold, Italic, Heading2, Heading3, Type, List, LinkIcon,
  Image as ImageIcon, Save, Download, Copy, Check, Loader2,
  Undo2, Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const editorRef = useRef<HTMLDivElement>(null);
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [copied, setCopied] = useState(false);

  // Load article
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("id", articleId)
        .single();
      if (data) setArticle(data);
      setLoading(false);
    }
    load();
  }, [articleId]);

  // Set editor content
  useEffect(() => {
    if (article?.content && editorRef.current) {
      // If content is HTML, use directly; if markdown, convert
      const content = article.content;
      const isHtml = content.includes("<h2") || content.includes("<p>");
      editorRef.current.innerHTML = isHtml ? content : markdownToHtml(content);
      updateWordCount();
    }
  }, [article]);

  const updateWordCount = useCallback(() => {
    if (!editorRef.current) return;
    const clone = editorRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("img").forEach(img => img.remove());
    const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
    setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    setTimeout(updateWordCount, 30);
  };

  const saveContent = async () => {
    if (!editorRef.current) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("articles").update({
      content: editorRef.current.innerHTML,
      word_count: wordCount,
    }).eq("id", articleId);
    toast.success("Salvo!");
    setSaving(false);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(editorRef.current?.innerHTML ?? "");
    setCopied(true);
    toast.success("HTML copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(article?.keyword || "artigo").replace(/\s+/g, "-").slice(0, 50)}.txt`;
    a.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!article) {
    return <div className="text-center py-20 text-muted-foreground">Artigo nao encontrado</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/articles")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-[family-name:var(--font-display)] tracking-tight truncate">
            {article.title}
          </h1>
          <p className="text-xs text-muted-foreground truncate">
            Keyword: <span className="text-foreground font-semibold">{article.keyword}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={downloadText}>
            <Download className="w-3 h-3" /> Baixar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={copyHtml}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={saveContent} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
          </Button>
        </div>
      </div>

      {/* Editor */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-3 py-2 bg-card border border-border rounded-t-xl border-b-0 flex-wrap">
          <TBtn icon={Undo2} label="Desfazer" onClick={() => exec("undo")} />
          <TBtn icon={Redo2} label="Refazer" onClick={() => exec("redo")} />
          <Sep />
          <TBtn icon={Bold} label="Negrito" onClick={() => exec("bold")} />
          <TBtn icon={Italic} label="Italico" onClick={() => exec("italic")} />
          <Sep />
          <TBtn icon={Heading2} label="H2" onClick={() => exec("formatBlock", "h2")} />
          <TBtn icon={Heading3} label="H3" onClick={() => exec("formatBlock", "h3")} />
          <TBtn icon={Type} label="Paragrafo" onClick={() => exec("formatBlock", "p")} />
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
          onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveContent(); } }}
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
    </div>
  );
}

function TBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} title={label}
      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
function Sep() { return <div className="w-px h-4 bg-border mx-0.5" />; }

function markdownToHtml(md: string): string {
  const blocks = md.split(/\n{2,}/);
  const out: string[] = [];
  for (const raw of blocks) {
    const b = raw.trim(); if (!b) continue;
    const lines = b.split("\n").map(l => l.trimEnd());
    if (lines.length === 1 && lines[0].startsWith("#")) {
      const l = lines[0];
      if (l.startsWith("### ")) { out.push(`<h3>${inl(l.slice(4))}</h3>`); continue; }
      if (l.startsWith("## "))  { out.push(`<h2>${inl(l.slice(3))}</h2>`); continue; }
      if (l.startsWith("# "))   { out.push(`<h1>${inl(l.slice(2))}</h1>`); continue; }
    }
    if (lines.length === 1) {
      const m = lines[0].match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (m) { out.push(`<img src="${m[2]}" alt="${m[1]}" />`); continue; }
    }
    if (lines.length === 1 && lines[0].startsWith("*") && lines[0].endsWith("*") && lines[0].length < 120) {
      out.push(`<p><em style="font-size:11px;opacity:0.5">${lines[0].slice(1, -1)}</em></p>`);
      continue;
    }
    if (lines.every(l => l.startsWith("- ") || !l.trim())) {
      out.push("<ul>" + lines.filter(l => l.startsWith("- ")).map(l => `<li>${inl(l.slice(2))}</li>`).join("") + "</ul>");
      continue;
    }
    if (lines[0].startsWith("#")) {
      const h = lines[0];
      if (h.startsWith("### ")) out.push(`<h3>${inl(h.slice(4))}</h3>`);
      else if (h.startsWith("## ")) out.push(`<h2>${inl(h.slice(3))}</h2>`);
      else out.push(`<h1>${inl(h.slice(2))}</h1>`);
      const rest = lines.slice(1).filter(l => l.trim()).map(l => inl(l)).join(" ");
      if (rest) out.push(`<p>${rest}</p>`);
      continue;
    }
    const text = lines.filter(l => l.trim()).map(l => inl(l)).join(" ");
    if (text) out.push(`<p>${text}</p>`);
  }
  return out.join("\n");
}

function inl(t: string): string {
  return t
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:12px;margin:16px 0" />')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
