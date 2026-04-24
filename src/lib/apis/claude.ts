/** Claude API - Article generation and support bot */

import { checkLimit, trackUsage } from "./rate-limiter";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";

function getHeaders() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  return {
    "x-api-key": key,
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  };
}

/** Generate an SEO article based on keyword and competitor analysis */
export async function generateArticle(params: {
  keyword: string;
  niche: string;
  competitorData: string;
  brandVoice?: {
    name: string;
    tone: string;
    audience: string;
    about: string;
  };
  targetWordCount?: number;
}) {
  const { keyword, niche, competitorData, brandVoice, targetWordCount = 2000 } = params;

  const { allowed } = checkLimit("claude:article");
  if (!allowed) throw new Error("Rate limit reached for article generation. Max 10/day.");
  trackUsage("claude:article");

  const systemPrompt = `Você é um redator SEO especialista. Gere artigos completos, otimizados para ranquear no Google.
${brandVoice ? `
Marca: ${brandVoice.name}
Tom: ${brandVoice.tone}
Público: ${brandVoice.audience}
Sobre: ${brandVoice.about}` : ""}

Regras:
- Título H1 otimizado com a keyword
- Estrutura com H2 e H3 bem organizados
- Keyword principal usada naturalmente 4-7 vezes
- Parágrafos curtos (3-4 linhas)
- Use listas e bullet points quando apropriado
- Inclua uma seção de FAQ no final
- Meta description de 150-160 caracteres
- Retorne em formato JSON com: title, content (HTML), meta_description, word_count, headings_count`;

  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Gere um artigo de ${targetWordCount} palavras sobre "${keyword}" no nicho de ${niche}.

Análise dos concorrentes (top 10 do Google):
${competitorData}

O artigo deve ser melhor e mais completo que os concorrentes.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

/** Support bot - respond to customer message with context */
export async function supportBotResponse(params: {
  message: string;
  clientContext: {
    name: string;
    plan: string;
    sites: number;
    backlinks: number;
    score: number;
    daysSinceJoin: number;
  };
}) {
  const { message, clientContext } = params;

  const { allowed } = checkLimit("claude:support");
  if (!allowed) throw new Error("Rate limit reached for support bot");
  trackUsage("claude:support");

  const res = await fetch(`${ANTHROPIC_BASE}/messages`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      system: `Você é o assistente de suporte do 8links, uma plataforma de SEO automatizado.
Seja cordial, direto, e use linguagem simples (o cliente é leigo em SEO).
Se o cliente pedir cancelamento, mostre o progresso dele e tente reter, mas respeite a decisão.
Se não souber a resposta, diga que vai encaminhar para a equipe humana.

Contexto do cliente:
- Nome: ${clientContext.name}
- Plano: ${clientContext.plan}
- Sites: ${clientContext.sites}
- Backlinks ativos: ${clientContext.backlinks}
- Score SEO: ${clientContext.score}/100
- Cliente há: ${clientContext.daysSinceJoin} dias`,
      messages: [{
        role: "user",
        content: message,
      }],
    }),
  });

  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return {
    response: data.content[0].text,
    canResolve: !data.content[0].text.includes("equipe") && !data.content[0].text.includes("encaminhar"),
  };
}
