import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ domain: string; slug: string }>;
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function getPost(domain: string, slug: string) {
  const { data } = await getSupabase()
    .from("network_posts")
    .select("*")
    .eq("domain", decodeURIComponent(domain))
    .eq("slug", slug)
    .single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain, slug } = await params;
  const post = await getPost(domain, slug);
  if (!post) return { title: "Artigo não encontrado" };

  return {
    title: post.title,
    description: post.meta_description || post.content?.replace(/[#*\[\]!()]/g, "").slice(0, 160),
    openGraph: {
      title: post.title,
      description: post.meta_description,
      type: "article",
      siteName: post.domain,
      publishedTime: post.published_at,
      images: post.featured_image ? [post.featured_image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicArticlePage({ params }: Props) {
  const { domain, slug } = await params;
  const post = await getPost(domain, slug);
  if (!post) notFound();

  const html = mdToHtml(post.content ?? "");
  const date = new Date(post.published_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a0a0a", color: "#e8e8e8", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
          <div style={{ marginBottom: 40, borderBottom: "1px solid #222", paddingBottom: 20 }}>
            <p style={{ fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
              {decodeURIComponent(domain)}
            </p>
            <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 12 }}>{post.title}</h1>
            <p style={{ fontSize: 13, color: "#666" }}>Publicado em {date}</p>
          </div>

          <article dangerouslySetInnerHTML={{ __html: html }} style={{ fontSize: 16, lineHeight: 1.85, color: "#ccc" }} />

          <footer style={{ marginTop: 60, paddingTop: 20, borderTop: "1px solid #222", fontSize: 12, color: "#555" }}>
            <p>{decodeURIComponent(domain)} — {new Date().getFullYear()}</p>
          </footer>
        </main>
        <style dangerouslySetInnerHTML={{ __html: ARTICLE_CSS }} />
      </body>
    </html>
  );
}

const ARTICLE_CSS = `
article h1{font-size:28px;font-weight:800;margin:48px 0 16px;color:#fff}
article h2{font-size:22px;font-weight:700;margin:40px 0 16px;color:#fff;border-bottom:1px solid #1a1a1a;padding-bottom:8px}
article h3{font-size:18px;font-weight:600;margin:32px 0 12px;color:#eee}
article p{margin-bottom:16px;max-width:680px}
article ul,article ol{margin:12px 0;padding-left:24px}
article li{margin-bottom:6px}
article strong{color:#fff;font-weight:600}
article em{font-style:italic;color:#bbb}
article a{color:#f97316;text-decoration:underline;text-underline-offset:3px}
article a:hover{color:#fb923c}
article img{max-width:100%;border-radius:12px;margin:24px 0}
`;

function mdToHtml(md: string): string {
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
    if (lines.length===1&&lines[0].startsWith("*")&&lines[0].endsWith("*")&&lines[0].length<120) { out.push(`<p><em style="font-size:12px;color:#666">${lines[0].slice(1,-1)}</em></p>`); continue; }
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
  return t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>").replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}
