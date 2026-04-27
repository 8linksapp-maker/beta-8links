import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";

/**
 * POST /api/admin/delete-post
 * Body: { domain, slug }
 *
 * Deletes article from network_posts in the external Supabase.
 */
export async function POST(request: Request) {
  const { domain, slug } = await request.json();
  if (!domain || !slug) return NextResponse.json({ error: "domain and slug required" }, { status: 400 });

  const networkDb = createServerClient(
    process.env.NETWORK_SUPABASE_URL!,
    process.env.NETWORK_SUPABASE_SERVICE_KEY!
  );

  const { error } = await networkDb
    .from("network_posts")
    .delete()
    .eq("domain", domain)
    .eq("slug", slug);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
