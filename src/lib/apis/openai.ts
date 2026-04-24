/** OpenAI API - Web Search for AI visibility checking */

import { checkLimit, trackUsage } from "./rate-limiter";

const OPENAI_BASE = "https://api.openai.com/v1";

function getHeaders() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI API key not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

interface Citation {
  url: string;
  title: string;
}

interface AIVisibilityResult {
  query: string;
  response: string;
  citations: Citation[];
  siteFound: boolean;
  citationUrl?: string;
  citationSnippet?: string;
}

/** Check if a domain is cited in ChatGPT's response for a query */
export async function checkChatGPTVisibility(query: string, domain: string): Promise<AIVisibilityResult> {
  const { allowed } = checkLimit("openai:web_search");
  if (!allowed) throw new Error("Rate limit reached for OpenAI web search");
  trackUsage("openai:web_search");
  const res = await fetch(`${OPENAI_BASE}/responses`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      tools: [{ type: "web_search", search_context_size: "low" }],
      input: query,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();

  // Parse citations from annotations
  const citations: Citation[] = [];
  const output = data.output ?? [];

  for (const item of output) {
    if (item.type === "message" && item.content) {
      for (const block of item.content) {
        if (block.annotations) {
          for (const ann of block.annotations) {
            if (ann.type === "url_citation") {
              citations.push({ url: ann.url, title: ann.title ?? "" });
            }
          }
        }
      }
    }
  }

  const siteFound = citations.some(c => c.url.includes(domain));
  const matchedCitation = citations.find(c => c.url.includes(domain));

  return {
    query,
    response: output.find((i: { type: string }) => i.type === "message")?.content?.[0]?.text ?? "",
    citations,
    siteFound,
    citationUrl: matchedCitation?.url,
    citationSnippet: matchedCitation?.title,
  };
}
