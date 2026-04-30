import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads the authenticated user from a Supabase server client and attaches
 * the id + email to the current Sentry scope, so any error captured during
 * the request is associated with that user in the dashboard.
 *
 * Safe to call without a session — if no user is logged in, nothing happens.
 *
 * Usage in API routes:
 *   const supabase = await createClient();
 *   await attachSentryUser(supabase);
 *   // ... rest of handler
 */
export async function attachSentryUser(supabase: SupabaseClient): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      Sentry.setUser({
        id: data.user.id,
        email: data.user.email,
      });
    }
  } catch {
    // never block request if Sentry is misconfigured
  }
}
