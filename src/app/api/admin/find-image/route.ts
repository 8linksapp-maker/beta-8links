import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY ?? "";
const PEXELS_API_KEY = process.env.PEXELS_API_KEY ?? "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * POST /api/admin/find-image
 * Body: { heading: string, tagsPt?: string[] }
 *
 * 1. Search image_bank by PT-BR tags
 * 2. If not found → translate to EN → search Unsplash → fallback Pexels
 * 3. Download → upload to Supabase Storage → Vision describe in PT-BR → save with tags
 * 4. Return image URL
 */
export async function POST(request: Request) {
  const { heading, tagsPt, excludeUrls = [] } = await request.json();
  if (!heading) return NextResponse.json({ error: "heading required" }, { status: 400 });

  const supabase = await createClient();

  // Step 1: GPT generates search tags in PT-BR and EN
  let ptTags: string[] = tagsPt ?? [];
  let enQuery = "";

  if (ptTags.length === 0) {
    try {
      const gptRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4.1-nano", temperature: 0.2, max_tokens: 100,
          messages: [{ role: "user", content: `Heading de artigo: "${heading}"

Retorne JSON: {"tagsPt": ["tag1", "tag2", "tag3", "tag4"] (4 tags em português), "queryEn": "search query in English for stock photo" (2-3 words)}` }],
          response_format: { type: "json_object" },
        }),
      });
      const gptData = await gptRes.json();
      const parsed = JSON.parse(gptData.choices[0].message.content);
      ptTags = parsed.tagsPt ?? [];
      enQuery = parsed.queryEn ?? "";
    } catch {}
  }

  if (ptTags.length === 0) {
    ptTags = heading.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
  }
  if (!enQuery) {
    enQuery = heading;
  }

  // Step 2: Search image_bank by PT-BR tags (exclude already used URLs)
  let cacheQuery = supabase
    .from("image_bank")
    .select("*")
    .overlaps("tags", ptTags)
    .order("used_count", { ascending: true })
    .limit(10);

  const { data: cached } = await cacheQuery;

  // Find first result not in excludeUrls
  const cachedMatch = (cached ?? []).find((img: any) => !excludeUrls.includes(img.storage_url) && !excludeUrls.includes(img.original_url));

  if (cachedMatch) {
    await supabase.from("image_bank").update({ used_count: cachedMatch.used_count + 1 }).eq("id", cachedMatch.id);
    return NextResponse.json({
      url: cachedMatch.storage_url,
      description: cachedMatch.description,
      credit: cachedMatch.credit,
      source: "cache",
      tags: cachedMatch.tags,
    });
  }

  // Step 3: Search Unsplash
  let imageUrl = "";
  let credit = "";
  let source = "unsplash";
  let width = 0;
  let height = 0;

  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(enQuery)}&per_page=5&orientation=landscape`, {
        headers: { "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (data.results?.length > 0) {
        // Pick first photo not already used
        const photo = data.results.find((p: any) => !excludeUrls.includes(p.urls?.regular)) ?? data.results[0];
        imageUrl = photo.urls?.regular ?? photo.urls?.small ?? "";
        credit = `${photo.user?.name ?? "Unknown"} / Unsplash`;
        width = photo.width ?? 0;
        height = photo.height ?? 0;
        if (photo.links?.download_location) {
          fetch(photo.links.download_location, { headers: { "Authorization": `Client-ID ${UNSPLASH_ACCESS_KEY}` } }).catch(() => {});
        }
      }
    } catch {}
  }

  // Step 4: Fallback to Pexels
  if (!imageUrl && PEXELS_API_KEY) {
    try {
      const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(enQuery)}&per_page=5&orientation=landscape`, {
        headers: { "Authorization": PEXELS_API_KEY },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      if (data.photos?.length > 0) {
        const photo = data.photos.find((p: any) => !excludeUrls.includes(p.src?.large)) ?? data.photos[0];
        imageUrl = photo.src?.large ?? photo.src?.medium ?? "";
        credit = `${photo.photographer ?? "Unknown"} / Pexels`;
        width = photo.width ?? 0;
        height = photo.height ?? 0;
        source = "pexels";
      }
    } catch {}
  }

  if (!imageUrl) {
    return NextResponse.json({ error: "No image found", heading, enQuery, ptTags });
  }

  // Step 5: Download image and upload to Supabase Storage
  let storagePath = "";
  let storageUrl = "";

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = imageUrl.includes(".png") ? "png" : "jpg";
    const fileName = `${Date.now()}_${enQuery.replace(/[^a-z0-9]/gi, '_').slice(0, 40)}.${ext}`;
    storagePath = `images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("public")
      .upload(storagePath, imgBuffer, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) {
      console.error("[FindImage] Upload error:", uploadError);
      // Use original URL as fallback
      storageUrl = imageUrl;
    } else {
      const { data: urlData } = supabase.storage.from("public").getPublicUrl(storagePath);
      storageUrl = urlData.publicUrl;
    }
  } catch (e) {
    console.error("[FindImage] Download/upload error:", e);
    storageUrl = imageUrl;
    storagePath = "external";
  }

  // Step 6: GPT Vision describes the image in PT-BR and generates tags
  let description = heading;
  let visionTags = ptTags;

  if (OPENAI_API_KEY) {
    try {
      const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Descreva esta imagem em português brasileiro para uso como foto de blog.

Retorne JSON:
{
  "description": "descrição em 1 frase para alt text, focando no TEMA/CONTEXTO da imagem, não nos objetos",
  "tags": ["tag1", ..., "tag10"] (10 tags em português)
}

REGRAS PARA TAGS:
- As primeiras 5 tags devem ser sobre o TEMA/ASSUNTO que a imagem representa (ex: "contabilidade", "finanças", "planejamento financeiro", "gestão empresarial", "negócios")
- As últimas 5 tags sobre elementos visuais relevantes (ex: "escritório", "documentos", "calculadora")
- NÃO inclua tags genéricas como "mesa", "papel", "objeto"
- Pense: "em qual artigo de blog essa imagem seria usada?"` },
              { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
            ],
          }],
          response_format: { type: "json_object" },
        }),
      });
      const visionData = await visionRes.json();
      const visionParsed = JSON.parse(visionData.choices?.[0]?.message?.content ?? "{}");
      if (visionParsed.description) description = visionParsed.description;
      if (visionParsed.tags?.length > 0) visionTags = visionParsed.tags;
    } catch (e) {
      console.error("[FindImage] Vision error:", e);
    }
  }

  // Step 7: Save to image_bank
  const { error: insertError } = await supabase.from("image_bank").insert({
    storage_url: storageUrl,
    storage_path: storagePath,
    original_url: imageUrl,
    description,
    tags: visionTags,
    search_query_en: enQuery,
    search_query_pt: heading,
    credit,
    width,
    height,
    source,
    used_count: 1,
  });

  if (insertError) console.error("[FindImage] DB insert error:", insertError);

  return NextResponse.json({
    url: storageUrl,
    description,
    credit,
    source,
    tags: visionTags,
    enQuery,
  });
}
