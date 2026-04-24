/** Perplexity API - Search with citations */

import { checkLimit, trackUsage } from "./rate-limiter";

const PERPLEXITY_BASE = "https://api.perplexity.ai";

function getHeaders() {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("Perplexity API key not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

interface PerplexityResult {
  query: string;
  response: string;
  citations: string[];
  siteFound: boolean;
  citationUrl?: string;
}

/** Check if a domain is cited in Perplexity's response */
export async function checkPerplexityVisibility(query: string, domain: string): Promise<PerplexityResult> {
  const { allowed } = checkLimit("perplexity:search");
  if (!allowed) throw new Error("Rate limit reached for Perplexity");
  trackUsage("perplexity:search");
  const res = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!res.ok) throw new Error(`Perplexity error: ${res.status}`);
  const data = await res.json();

  // IMPORTANT: Use citations from response object, NOT from text (those are hallucinated)
  const citations: string[] = data.citations ?? [];
  const response = data.choices?.[0]?.message?.content ?? "";

  const siteFound = citations.some(url => url.includes(domain));
  const matchedUrl = citations.find(url => url.includes(domain));

  return {
    query,
    response,
    citations,
    siteFound,
    citationUrl: matchedUrl,
  };
}
