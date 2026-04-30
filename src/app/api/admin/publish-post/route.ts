import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { validateBacklinkContent } from "@/lib/utils/link-validation";

export const maxDuration = 30;

/**
 * POST /api/admin/publish-post
 * Body: { backlinkId, content, title, domain }
 *
 * Publishes/updates article in the network Supabase (network_posts table).
 * Called from the backlink review page when user clicks "Publicar no site".
 */
export async function POST(request: Request) {
  const { backlinkId, content, title, domain } = await request.json();
  if (!backlinkId || !content || !domain) {
    return NextResponse.json({ error: "backlinkId, content, domain required" }, { status: 400 });
  }

  const appDb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: backlink } = await appDb
    .from("backlinks")
    .select("target_url, user_id")
    .eq("id", backlinkId)
    .single();

  if (!backlink?.target_url) {
    return NextResponse.json({ error: "Backlink não encontrado ou sem URL de destino" }, { status: 404 });
  }

  if (backlink.user_id) {
    const { data: profile } = await appDb.from("profiles").select("email").eq("id", backlink.user_id).single();
    Sentry.setUser({ id: backlink.user_id, email: profile?.email });
  }
  Sentry.setTag("backlinkId", backlinkId);

  const validation = validateBacklinkContent({
    content,
    targetUrl: backlink.target_url,
    publisherDomain: domain,
  });
  if (!validation.ok) {
    console.warn(`[publish-post] validation failed for backlink ${backlinkId}: ${validation.reason}`, validation.offendingLinks);
    return NextResponse.json(
      { error: validation.reason, offendingLinks: validation.offendingLinks },
      { status: 400 }
    );
  }

  const networkDb = createServerClient(
    process.env.NETWORK_SUPABASE_URL!,
    process.env.NETWORK_SUPABASE_SERVICE_KEY!
  );

  // Find network site ID in external DB
  const { data: site } = await networkDb
    .from("network_sites")
    .select("id")
    .eq("domain", domain)
    .single();

  if (!site) {
    return NextResponse.json({ error: `Site ${domain} não encontrado na rede` }, { status: 404 });
  }

  const slug = (title ?? "post")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Extract first image as featured
  const firstImage = content.match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1] ??
    content.match(/src="([^"]+)"/)?.[1] ?? null;

  // Extract meta description from first paragraph text
  const metaDesc = content
    .replace(/<[^>]+>/g, " ").replace(/[#*\[\]!()]/g, "")
    .replace(/\s+/g, " ").trim().slice(0, 160);

  // Upsert to network_posts
  const { error } = await networkDb.from("network_posts").upsert({
    network_site_id: site.id,
    domain,
    slug,
    title: title ?? slug,
    content,
    meta_description: metaDesc,
    featured_image: firstImage,
    published_at: new Date().toISOString(),
  }, { onConflict: "domain,slug" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await appDb.from("backlinks").update({
    status: "published",
    published_url: `https://${domain}/${slug}`,
    article_content: content,
    published_at: new Date().toISOString(),
  }).eq("id", backlinkId);

  return NextResponse.json({
    success: true,
    url: `https://${domain}/${slug}`,
    slug,
  });
}
