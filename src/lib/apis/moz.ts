/**
 * Moz Domain Authority API (via RapidAPI)
 * Endpoint: domain-da-pa-check5.p.rapidapi.com
 */

export interface MozResult {
  da: number;
  pa: number;
  spam: number;
}

const RAPIDAPI_KEY = process.env.MOZ_RAPIDAPI_KEY ?? "75ac442425mshb7f8a38378e8c64p186c34jsn7070a3443466";
const RAPIDAPI_HOST = "domain-da-pa-check5.p.rapidapi.com";

export async function getMozDA(domain: string): Promise<MozResult> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\/$/, "");

  const res = await fetch(`https://${RAPIDAPI_HOST}/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": RAPIDAPI_HOST,
      "x-rapidapi-key": RAPIDAPI_KEY,
    },
    body: JSON.stringify({ target: cleanDomain }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Moz API HTTP ${res.status}`);
  const data = await res.json();

  return {
    da: data.domain_authority ?? data.da ?? 0,
    pa: data.page_authority ?? data.pa ?? 0,
    spam: data.spam_score ?? 0,
  };
}
