import { NextResponse } from "next/server";
import { analyzeSERP } from "@/lib/apis/dataforseo";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";

/**
 * POST /api/admin/auto-article
 * Body: {
 *   planKeywords: string[] — keywords from the network site's content calendar
 *   backlink: { url, anchor, clientDescription }
 *   networkContext: string — context of the network site
 *   model: string
 * }
 *
 * 1. GPT picks the best keyword from the plan that fits the client's backlink
 * 2. Runs the full article pipeline with that keyword
 */
export async function POST(request: Request) {
  const { planKeywords, backlink, networkContext, model = "gpt-5.4-nano" } = await request.json();

  if (!planKeywords?.length || !backlink?.anchor) {
    return NextResponse.json({ error: "planKeywords and backlink.anchor required" }, { status: 400 });
  }

  const startTime = Date.now();
  const steps: Array<{ step: string; duration: number; data?: any }> = [];

  // Step 1: GPT picks the best keyword
  const s1 = Date.now();
  const pickRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4.1-mini", temperature: 0.2, max_tokens: 300,
      messages: [{ role: "user", content: `Sou um especialista em link building. Preciso escolher a MELHOR keyword de um planejamento de conteúdo para escrever um artigo que permita inserir um backlink de forma natural.

BACKLINK DO CLIENTE:
- Âncora: "${backlink.anchor}"
- Site: ${backlink.url || ""}
- Sobre: ${backlink.clientDescription || ""}

SITE DA REDE (onde o artigo será publicado):
${networkContext || "Blog de conteúdo"}

PLANEJAMENTO DE KEYWORDS (escolha UMA):
${planKeywords.slice(0, 50).map((k: string, i: number) => `${i + 1}. ${k}`).join("\n")}

REGRAS:
- Escolha a keyword onde o backlink "${backlink.anchor}" encaixa NATURALMENTE
- O artigo deve ser sobre o tema da keyword, NÃO sobre o cliente
- O backlink entra como uma referência/recomendação útil pro leitor
- Se NENHUMA keyword permite encaixe natural, diga "nenhuma"
- Prefira keywords com temas que se CONECTAM com o serviço do cliente

Retorne JSON: {"keywordIndex": 0, "keyword": "...", "reason": "por que essa keyword permite encaixar o backlink", "articleAngle": "como o artigo vai abordar o tema e onde o link entra"}` }],
      response_format: { type: "json_object" },
    }),
  });

  let picked: any;
  try {
    picked = JSON.parse((await pickRes.json()).choices[0].message.content);
  } catch { picked = { keyword: "nenhuma" }; }

  steps.push({ step: "1. GPT escolhe keyword", duration: Date.now() - s1, data: picked });

  if (!picked.keyword || picked.keyword === "nenhuma") {
    return NextResponse.json({ error: "Nenhuma keyword do planejamento permite encaixe natural com esse backlink", steps, picked });
  }

  // Step 2: Call test-article with the chosen keyword
  const baseUrl = request.url.replace(/\/api\/admin\/auto-article.*/, "");
  const articleRes = await fetch(`${baseUrl}/api/admin/test-article`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: picked.keyword,
      model,
      siteContext: networkContext,
      backlink,
    }),
  });

  const articleData = await articleRes.json();

  return NextResponse.json({
    ...articleData,
    pickedKeyword: picked,
    totalDuration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
  });
}
