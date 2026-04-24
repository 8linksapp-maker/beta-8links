import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/public/articles?domain=example.com.br
 * GET /api/public/articles?domain=example.com.br&slug=como-fazer-x
 *
 * Public API for network sites to fetch their published articles.
 * Reads from network_posts table.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const slug = searchParams.get("slug");

  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Single article
  if (slug) {
    const { data: post } = await supabase
      .from("network_posts")
      .select("*")
      .eq("domain", domain)
      .eq("slug", slug)
      .single();

    if (!post) return NextResponse.json({ error: "Article not found" }, { status: 404 });

    return NextResponse.json(post, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // List all articles
  const { data: posts } = await supabase
    .from("network_posts")
    .select("id, slug, title, meta_description, featured_image, published_at")
    .eq("domain", domain)
    .order("published_at", { ascending: false });

  return NextResponse.json({
    domain,
    articles: posts ?? [],
    total: posts?.length ?? 0,
  }, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
