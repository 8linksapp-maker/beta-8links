import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface Props { params: Promise<{ domain: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  return { title: `Blog — ${decodeURIComponent(domain)}`, robots: { index: true, follow: true } };
}

export default async function SiteListPage({ params }: Props) {
  const { domain } = await params;
  const decodedDomain = decodeURIComponent(domain);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: posts } = await supabase
    .from("network_posts")
    .select("id, slug, title, meta_description, featured_image, published_at")
    .eq("domain", decodedDomain)
    .order("published_at", { ascending: false });

  if (!posts) notFound();

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#0a0a0a", color: "#e8e8e8", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px 80px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Blog</h1>
          <p style={{ fontSize: 13, color: "#666", marginBottom: 40 }}>{decodedDomain} · {posts.length} artigos</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {posts.map((p: any) => (
              <a key={p.id} href={`/s/${domain}/${p.slug}`}
                style={{ textDecoration: "none", color: "inherit", padding: 24, border: "1px solid #1a1a1a", borderRadius: 12, display: "block" }}>
                {p.featured_image && <img src={p.featured_image} alt="" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8, marginBottom: 12 }} loading="lazy" />}
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#fff" }}>{p.title}</h2>
                <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>{p.meta_description}</p>
                <p style={{ fontSize: 12, color: "#555" }}>{new Date(p.published_at).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}</p>
              </a>
            ))}
          </div>

          {posts.length === 0 && <p style={{ textAlign: "center", color: "#555", padding: 40 }}>Nenhum artigo publicado ainda.</p>}
        </main>
      </body>
    </html>
  );
}
