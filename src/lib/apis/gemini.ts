/** Gemini API - with Google Search grounding for AI visibility */

import { checkLimit, trackUsage } from "./rate-limiter";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key not configured");
  return key;
}

interface GeminiResult {
  query: string;
  response: string;
  citations: Array<{ url: string; title: string }>;
  siteFound: boolean;
  citationUrl?: string;
}

/** Check if a domain is cited in Gemini's response with Google Search grounding */
export async function checkGeminiVisibility(query: string, domain: string): Promise<GeminiResult> {
  const { allowed } = checkLimit("gemini:grounding");
  if (!allowed) throw new Error("Rate limit reached for Gemini");
  trackUsage("gemini:grounding");
  const key = getKey();

  const res = await fetch(`${GEMINI_BASE}/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query }] }],
      tools: [{ googleSearch: {} }],
    }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
  const data = await res.json();

  const citations: Array<{ url: string; title: string }> = [];
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text ?? "";

  // Extract citations from grounding metadata
  const groundingMeta = candidate?.groundingMetadata;
  if (groundingMeta?.groundingChunks) {
    for (const chunk of groundingMeta.groundingChunks) {
      if (chunk.web) {
        citations.push({ url: chunk.web.uri, title: chunk.web.title ?? "" });
      }
    }
  }

  const siteFound = citations.some(c => c.url.includes(domain));
  const matchedCitation = citations.find(c => c.url.includes(domain));

  return {
    query,
    response: content,
    citations,
    siteFound,
    citationUrl: matchedCitation?.url,
  };
}
