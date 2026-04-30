"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Sentry user in sync with the authenticated Supabase session.
 *
 * - On mount: reads current session, sets user if present.
 * - On auth change (login/logout/token refresh): updates Sentry scope.
 * - On unmount: clears the user (rare in our app, but safe).
 *
 * Mount once near the top of the authenticated layout.
 */
export function SentryUserSync() {
  useEffect(() => {
    const supabase = createClient();

    function applyUser(user: { id: string; email?: string | null } | null) {
      if (user) {
        Sentry.setUser({ id: user.id, email: user.email ?? undefined });
      } else {
        Sentry.setUser(null);
      }
    }

    supabase.auth.getUser().then(({ data }) => applyUser(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
      Sentry.setUser(null);
    };
  }, []);

  return null;
}
