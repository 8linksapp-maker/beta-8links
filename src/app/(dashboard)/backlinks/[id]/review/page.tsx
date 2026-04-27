"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Check, Loader2, Send, Globe,
  Bold, Italic, Heading2, Heading3, Type, LinkIcon, List,
  Undo2, Redo2, Image as ImageIcon, ExternalLink, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export default function BacklinkReviewPage() {
  const router = useRouter();
  const params = useParams();
  const backlinkId = params.id as string;

  const [backlink, setBacklink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);

  // Load backlink
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("backlinks")
        .select("*, network_sites(domain, niche, da)")
        .eq("id", backlinkId)
        .single();
      if (data) {
        setBacklink(data);
        setPublished(!!data.published_url && data.status === "published");
      }
      setLoading(false);
    }
    load();
  }, [backlinkId]);

  // Set editor content after load
  useEffect(() => {
    if (backlink?.article_content && editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(backlink.article_content);
      countWords();
    }
  }, [backlink]);

  const countWords = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || "";
    setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(editorRef.current?.innerHTML ?? "");
    setCopied(true);
    toast.success("HTML copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const publishToSite = async () => {
    if (!backlink) return;
    setPublishing(true);

    try {
      const supabase = createClient();
      const editedContent = editorRef.current?.innerHTML ?? backlink.article_content;

      // Save edited content back to backlink
      await supabase.from("backlinks").update({
        article_content: editedContent,
      }).eq("id", backlinkId);

      // Publish to network_posts (external Supabase)
      const res = await fetch("/api/admin/publish-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backlinkId,
          content: editedContent,
          title: backlink.article_title,
          domain: backlink.network_sites?.domain,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setPublished(true);
        setBacklink({ ...backlink, published_url: result.url });
        toast.success(
          <div>
            <p className="font-bold">Artigo publicado!</p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs mt-1 block">
              {result.url}
            </a>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.error(result.error || "Erro ao publicar");
      }
    } catch {
      toast.error("Erro ao publicar");
    }

    setPublishing(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!backlink) {
    return <div className="text-center py-20 text-muted-foreground">Backlink não encontrado</div>;
  }

  const site = backlink.network_sites;

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/backlinks")} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold font-[family-name:var(--font-display)] tracking-tight truncate">
            {backlink.article_title}
          </h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {site?.domain}</span>
            <span>DA {site?.da}</span>
            <span>Âncora: <span className="text-foreground font-semibold">{backlink.anchor_text}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={copyHtml}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copiado!" : "HTML"}
          </Button>
          <Button size="sm" className={`gap-1.5 text-xs h-8 ${published ? "bg-success hover:bg-success/80" : ""}`} onClick={publishToSite} disabled={publishing}>
            {publishing ? <Loader2 className="w-3 h-3 animate-spin" /> : published ? <CheckCircle2 className="w-3 h-3" /> : <Send className="w-3 h-3" />}
            {publishing ? "Publicando..." : published ? "Republicar" : "Publicar no site"}
          </Button>
        </div>
      </div>

      {/* Backlink info */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Destino:</span>
            <a href={backlink.target_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono flex items-center gap-1">
              {backlink.target_url?.replace(/^https?:\/\//, "").slice(0, 40)} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
          {backlink.published_url && (
            <a href={backlink.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-success hover:underline flex items-center gap-1">
              Ver no site <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </CardContent>
      </Card>

      {/* Editor */}
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

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={countWords}
          className="min-h-[60vh] max-h-[70vh] p-8 bg-card border border-border rounded-b-xl
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
    const lines = b.split("\n");
    if (lines.length===1&&lines[0].startsWith("###")) { out.push(`<h3>${inl(lines[0].slice(4))}</h3>`); continue; }
    if (lines.length===1&&lines[0].startsWith("## ")) { out.push(`<h2>${inl(lines[0].slice(3))}</h2>`); continue; }
    if (lines.length===1&&lines[0].startsWith("# "))  { out.push(`<h1>${inl(lines[0].slice(2))}</h1>`); continue; }
    const img = lines.length===1&&lines[0].match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (img) { out.push(`<img src="${img[2]}" alt="${img[1]}" loading="lazy"/>`); continue; }
    if (lines.length===1&&lines[0].startsWith("*")&&lines[0].endsWith("*")&&lines[0].length<120) { out.push(`<p><em style="font-size:12px;opacity:0.5">${lines[0].slice(1,-1)}</em></p>`); continue; }
    if (lines.every(l=>l.startsWith("- ")||!l.trim())) { out.push("<ul>"+lines.filter(l=>l.startsWith("- ")).map(l=>`<li>${inl(l.slice(2))}</li>`).join("")+"</ul>"); continue; }
    if (lines[0].startsWith("#")) {
      const h=lines[0];
      if(h.startsWith("### "))out.push(`<h3>${inl(h.slice(4))}</h3>`);
      else if(h.startsWith("## "))out.push(`<h2>${inl(h.slice(3))}</h2>`);
      else out.push(`<h1>${inl(h.slice(2))}</h1>`);
      const r=lines.slice(1).filter(l=>l.trim()).map(l=>inl(l)).join(" ");
      if(r)out.push(`<p>${r}</p>`);
      continue;
    }
    const t=lines.filter(l=>l.trim()).map(l=>inl(l)).join(" ");
    if(t)out.push(`<p>${t}</p>`);
  }
  return out.join("\n");
}

function inl(t:string):string{
  return t
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" style="max-width:100%;border-radius:12px;margin:16px 0" />')
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
