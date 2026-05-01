/**
 * Read USD→BRL exchange rate.
 * Set USD_BRL_RATE env var to override the fallback (e.g. when BRL drifts).
 */
export function getUsdBrlRate(): number {
  const raw = process.env.USD_BRL_RATE;
  if (!raw) return 5.7;
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5.7;
  return parsed;
}
