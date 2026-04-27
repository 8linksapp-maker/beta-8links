import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { useActionOrFail } from "@/lib/actions/usage";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * POST /api/admin/process-backlink
 * Body: { backlinkId: string }
 *
 * Processes a queued backlink:
 * 1. Gets backlink + network site + content_calendar
 * 2. GPT picks best keyword from calendar
 * 3. Calls test-article to generate the article
 * 4. Saves article and updates backlink status
 */
export const maxDuration = 300; // Vercel Pro: 5 min timeout

export async function POST(request: Request) {
  const { backlinkId } = await request.json();
  if (!backlinkId) return NextResponse.json({ error: "backlinkId required" }, { status: 400 });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // ── Step 1: Load backlink ──
  const { data: backlink } = await supabase
    .from("backlinks")
    .select("*, client_sites(url, niche_primary, site_context)")
    .eq("id", backlinkId)
    .single();

  if (!backlink) return NextResponse.json({ error: "Backlink não encontrado" }, { status: 404 });
  if (backlink.status !== "queued") return NextResponse.json({ error: "Backlink já processado", status: backlink.status });

  // Check usage limit
  const usage = await useActionOrFail(backlink.user_id, "backlink", backlinkId);
  if (usage.error) {
    await supabase.from("backlinks").update({ status: "error", error_message: usage.error }).eq("id", backlinkId);
    return NextResponse.json({ error: usage.error }, { status: 429 });
  }

  // Update status to generating
  await supabase.from("backlinks").update({ status: "generating" }).eq("id", backlinkId);

  const clientSite = backlink.client_sites;

  try {
    // ── Step 2: Find or assign network site ──
    let networkSite: any = null;

    if (backlink.network_site_id) {
      const { data } = await supabase.from("network_sites").select("id, domain, niche, site_context, vercel_url").eq("id", backlink.network_site_id).single();
      networkSite = data;
    }

    // Auto-assign: pick best network site by DA (no dependency on content_calendar)
    if (!networkSite) {
      const { data: sites } = await supabase
        .from("network_sites")
        .select("id, domain, niche, site_context, vercel_url, da")
        .eq("status", "active")
        .order("da", { ascending: false });

      if (sites?.length) {
        // Pick a random site from top 10 by DA (avoid always using the same one)
        const top = sites.slice(0, Math.min(10, sites.length));
        networkSite = top[Math.floor(Math.random() * top.length)];
        await supabase.from("backlinks").update({ network_site_id: networkSite.id }).eq("id", backlinkId);
      }
    }

    if (!networkSite) {
      await supabase.from("backlinks").update({ status: "error", error_message: "Nenhum site ativo na rede" }).eq("id", backlinkId);
      return NextResponse.json({ error: "Nenhum site da rede disponível" });
    }

    const networkCtx = networkSite.site_context ?? {};

    // ── Step 3: GPT generates keyword on the fly ──
    // No dependency on content_calendar — GPT creates the best keyword
    // based on anchor text + network site niche
    const pickRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini", temperature: 0.3, max_tokens: 300,
        messages: [{ role: "user", content: `Crie a MELHOR keyword (palavra-chave) para um artigo de blog que permita inserir um backlink naturalmente.

BACKLINK A INSERIR:
- Texto âncora: "${backlink.anchor_text}"
- URL destino: ${backlink.target_url}
- Nicho do cliente: ${clientSite?.niche_primary ?? "geral"}

SITE QUE VAI PUBLICAR O ARTIGO:
- Domínio: ${networkSite.domain}
- Nicho: ${networkSite.niche}
${networkCtx.gptSummary ? `- Sobre: ${networkCtx.gptSummary}` : ""}

REGRAS:
1. A keyword deve ser algo que PESSOAS REALMENTE BUSCAM no Google Brasil
2. Deve ser do nicho do SITE PARCEIRO (${networkSite.niche}), não do cliente
3. O artigo sobre essa keyword deve permitir mencionar "${backlink.anchor_text}" de forma NATURAL
4. Use formato de busca real: "como...", "o que é...", "melhores...", "dicas de...", etc.
5. A keyword deve ter potencial de volume de busca (não invente termos obscuros)

JSON: {"keyword": "a keyword escolhida", "reason": "por que essa keyword permite o backlink", "articleAngle": "como o artigo vai abordar o tema"}` }],
        response_format: { type: "json_object" },
      }),
    });

    let picked: any;
    try { picked = JSON.parse((await pickRes.json()).choices[0].message.content); } catch { picked = null; }

    if (!picked?.keyword) {
      await supabase.from("backlinks").update({ status: "error", error_message: "GPT não conseguiu gerar keyword" }).eq("id", backlinkId);
      return NextResponse.json({ error: "Falha ao gerar keyword" });
    }

    // ── Step 5: Generate article ──
    const baseUrl = request.url.replace(/\/api\/admin\/process-backlink.*/, "");
    const articleRes = await fetch(`${baseUrl}/api/admin/test-article`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: picked.keyword,
        model: "gpt-4.1-mini",
        siteContext: `Blog ${networkSite.domain} — ${networkCtx.gptSummary ?? networkSite.niche}`,
        backlink: {
          url: backlink.target_url,
          anchor: backlink.anchor_text,
          clientDescription: clientSite?.site_context?.gptSummary ?? clientSite?.niche_primary ?? "",
        },
      }),
    });

    const articleData = await articleRes.json();

    if (!articleData.article) {
      await supabase.from("backlinks").update({
        status: "error",
        error_message: articleData.error ?? "Falha ao gerar artigo",
      }).eq("id", backlinkId);
      return NextResponse.json({ error: "Falha ao gerar artigo", details: articleData.error });
    }

    // ── Step 6: Save and publish ──
    const title = articleData.outline?.title ?? picked.keyword;
    const slug = title.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const now = new Date().toISOString();
    const metaDesc = articleData.outline?.metaDescription ?? "";
    const firstImage = (articleData.article ?? "").match(/!\[[^\]]*\]\(([^)]+)\)/)?.[1] ?? null;

    // Publish to EXTERNAL Supabase (the Astro sites read from here)
    const networkDb = createServerClient(
      process.env.NETWORK_SUPABASE_URL!,
      process.env.NETWORK_SUPABASE_SERVICE_KEY!
    );

    // Article ready — user will review and publish manually via /backlinks/[id]/review
    // Don't publish to network_posts yet (user needs to review first)

    await supabase.from("backlinks").update({
      status: "published",
      article_title: title,
      article_content: articleData.article,
      published_url: null, // Will be set when user clicks "Publicar" in review
      published_at: now,
      error_message: null,
    }).eq("id", backlinkId);

    return NextResponse.json({
      success: true,
      backlinkId,
      keyword: picked.keyword,
      reason: picked.reason,
      wordCount: articleData.stats?.wordCount,
      cost: articleData.stats?.costBRL,
      duration: articleData.stats?.totalDuration,
    });

  } catch (err) {
    await supabase.from("backlinks").update({
      status: "error",
      error_message: `Erro interno: ${err instanceof Error ? err.message : String(err)}`,
    }).eq("id", backlinkId);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
