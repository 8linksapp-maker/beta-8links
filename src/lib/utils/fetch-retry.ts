/**
 * fetch wrapper that retries on transient failures (429, 5xx, network errors).
 * Honors `Retry-After` header when present (capped at 10s).
 *
 * Does NOT retry on 4xx except 429 — those are caller errors (auth, bad request,
 * content policy) and won't fix themselves on retry.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: { maxRetries?: number; baseDelayMs?: number; label?: string } = {}
): Promise<Response> {
  const { maxRetries = 1, baseDelayMs = 1000, label = "fetch" } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      const shouldRetry = res.status === 429 || (res.status >= 500 && res.status < 600);
      if (!shouldRetry || attempt === maxRetries) return res;

      const retryAfter = res.headers.get("retry-after");
      const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN;
      const delay = !isNaN(parsed) ? Math.min(parsed * 1000, 10_000) : baseDelayMs * Math.pow(2, attempt);
      console.warn(`[${label}] HTTP ${res.status} on attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    } catch (e) {
      if (attempt === maxRetries) throw e;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[${label}] network error on attempt ${attempt + 1}/${maxRetries + 1}: ${e instanceof Error ? e.message : String(e)}, retrying in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error(`[${label}] fetchWithRetry exhausted retries`);
}
