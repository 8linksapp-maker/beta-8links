import { checkLimit, trackUsage } from "./rate-limiter";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.dataforseo.com/v3";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DataForSEO credentials not configured");
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function request(endpoint: string, body: unknown[], rateLimitKey: string) {
  // Check rate limit before making request
  const { allowed, remaining } = checkLimit(rateLimitKey);
  if (!allowed) {
    throw new Error(`Rate limit reached for ${rateLimitKey}. Try again tomorrow. (0 remaining)`);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": getAuth(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`DataForSEO error: ${res.status}`);

  // Track usage after successful request
  trackUsage(rateLimitKey);
  console.log(`[DataForSEO] ${rateLimitKey}: used 1 (${remaining - 1} remaining today)`);

  return res.json();
}

/** Get keyword rankings for a domain — max 1 keyword per call to save credits */
export async function getKeywordRankings(domain: string, keywords: string[], locationCode = 2076) {
  // Limit to max 5 keywords per call
  const limitedKws = keywords.slice(0, 5);
  return request("/serp/google/organic/live/advanced", limitedKws.map(kw => ({
    keyword: kw,
    location_code: locationCode,
    language_code: "pt",
    device: "desktop",
    se_domain: "google.com.br",
  })), "dataforseo:serp");
}

/** Get domain backlink summary */
export async function getBacklinkSummary(domain: string) {
  return request("/backlinks/summary/live", [{ target: domain }], "dataforseo:backlinks");
}

/** Get referring domains — 1 credit per call regardless of limit */
export async function getReferringDomains(domain: string, limit = 100, offset = 0) {
  return request("/backlinks/referring_domains/live", [{
    target: domain,
    limit: Math.min(limit, 100),
    offset,
    order_by: ["rank,desc"],
  }], "dataforseo:backlinks");
}

/** Get individual backlinks with URLs + anchor text */
export async function getBacklinks(domain: string, limit = 100, mode: "as_is" | "one_per_domain" | "one_per_anchor" = "one_per_domain") {
  return request("/backlinks/backlinks/live", [{
    target: domain,
    mode,
    limit: Math.min(limit, 100),
    order_by: ["rank,desc"],
  }], "dataforseo:backlinks");
}

/** Analyze SERP — top 10 results */
export async function analyzeSERP(keyword: string, locationCode = 2076, depth = 10) {
  return request("/serp/google/organic/live/advanced", [{
    keyword,
    location_code: locationCode,
    language_code: "pt",
    device: "desktop",
    depth,
  }], "dataforseo:serp");
}

/** Check Google AI Overview for a keyword */
export async function checkAIOverview(keyword: string, locationCode = 2076) {
  return request("/serp/google/ai_mode/live/advanced", [{
    keyword,
    location_code: locationCode,
    language_code: "pt",
  }], "dataforseo:ai_overview");
}

/** On-page content parsing */
export async function parsePageContent(url: string) {
  return request("/on_page/content_parsing", [{ url }], "dataforseo:onpage");
}

/** Get keyword suggestions — cached to avoid $0.012/call for repeated seeds */
export async function getKeywordSuggestions(keyword: string, locationCode = 2076) {
  const seed = keyword.trim().toLowerCase();
  const sb = getSupabaseAdmin();

  // Check cache first
  const { data: cached } = await sb
    .from("keyword_suggestions_cache")
    .select("items")
    .eq("seed", seed)
    .eq("location_code", locationCode)
    .single();

  if (cached) {
    console.log(`[DataForSEO] Cache HIT for seed "${seed}" — saved $0.012`);
    return { tasks: [{ result: [{ items: cached.items }] }] };
  }

  // Cache miss — call API
  const result = await request("/dataforseo_labs/google/keyword_suggestions/live", [{
    keyword: seed,
    location_code: locationCode,
    language_code: "pt",
    limit: 20,
  }], "dataforseo:keywords");

  // Save to cache
  const items = result?.tasks?.[0]?.result?.[0]?.items ?? [];
  if (items.length > 0) {
    await sb.from("keyword_suggestions_cache").upsert({
      seed,
      location_code: locationCode,
      items,
    }, { onConflict: "seed,location_code" }).then(({ error }) => {
      if (error) console.error(`[DataForSEO] Cache save error:`, error.message);
      else console.log(`[DataForSEO] Cached ${items.length} items for seed "${seed}"`);
    });
  }

  return result;
}

/** Get keywords a domain already ranks for */
export async function getRankedKeywords(domain: string, locationCode = 2076) {
  return request("/dataforseo_labs/google/ranked_keywords/live", [{
    target: domain,
    location_code: locationCode,
    language_code: "pt",
    limit: 20,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
    filters: [
      ["ranked_serp_element.serp_item.rank_absolute", "<=", 100]
    ],
  }], "dataforseo:keywords");
}

/** Get competing domains */
export async function getCompetitorDomains(domain: string, locationCode = 2076) {
  return request("/dataforseo_labs/google/competitors_domain/live", [{
    target: domain,
    location_code: locationCode,
    language_code: "pt",
    limit: 5,
  }], "dataforseo:keywords");
}
