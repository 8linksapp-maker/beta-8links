/**
 * Rate limiter for external API calls.
 * Tracks daily usage per API and blocks when limit is reached.
 * Uses in-memory store (resets on server restart).
 * For production, migrate to Redis or Supabase table.
 */

interface UsageEntry {
  count: number;
  date: string; // YYYY-MM-DD
}

const usage: Record<string, UsageEntry> = {};

const DAILY_LIMITS: Record<string, number> = {
  "dataforseo:serp": 200,
  "dataforseo:backlinks": 200,
  "dataforseo:keywords": 200,
  "dataforseo:onpage": 100,
  "dataforseo:ai_overview": 50,
  "openai:web_search": 100,
  "perplexity:search": 100,
  "gemini:grounding": 50,
  "claude:article": 50,
  "claude:support": 100,
  "moz:da": 500,
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export function checkLimit(api: string): { allowed: boolean; remaining: number; limit: number } {
  const today = getToday();
  const limit = DAILY_LIMITS[api] ?? 100;

  if (!usage[api] || usage[api].date !== today) {
    usage[api] = { count: 0, date: today };
  }

  const remaining = Math.max(0, limit - usage[api].count);
  return { allowed: remaining > 0, remaining, limit };
}

export function trackUsage(api: string, count = 1): void {
  const today = getToday();

  if (!usage[api] || usage[api].date !== today) {
    usage[api] = { count: 0, date: today };
  }

  usage[api].count += count;
}

export function resetUsage(): void {
  for (const key of Object.keys(usage)) {
    delete usage[key];
  }
}

export function getUsageReport(): Record<string, { used: number; limit: number; remaining: number }> {
  const today = getToday();
  const report: Record<string, { used: number; limit: number; remaining: number }> = {};

  for (const [api, limit] of Object.entries(DAILY_LIMITS)) {
    const entry = usage[api];
    const used = entry?.date === today ? entry.count : 0;
    report[api] = { used, limit, remaining: Math.max(0, limit - used) };
  }

  return report;
}
