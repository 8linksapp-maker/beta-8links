"use server";

/**
 * @deprecated Use usage.ts instead.
 * Credits system replaced by per-action usage limits.
 * Kept for backwards compatibility.
 */

export { checkUsageLimit as getCredits, useActionOrFail as useCredits, getUsageSummary } from "./usage";
