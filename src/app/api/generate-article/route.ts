import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { useActionOrFail } from "@/lib/actions/usage";

export async function POST(request: Request) {
  const { keyword, niche, competitorData, brandVoice } = await request.json();
  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  // Auth + usage limit
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const usage = await useActionOrFail(user.id, "article", keyword);
  if (usage.error) return NextResponse.json({ error: usage.error, usage }, { status: 429 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Claude API not configured" });
  }

  try {
    const { generateArticle } = await import("@/lib/apis/claude");
    const result = await generateArticle({
      keyword,
      niche: niche ?? "geral",
      competitorData: competitorData ?? "Nenhum dado de concorrente disponível",
      brandVoice,
    });
    return NextResponse.json({ content: result });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
