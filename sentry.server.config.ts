// Sentry initialization for the Node.js server runtime (API routes, Server Actions).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% in prod (free tier handles ~10x more headroom). 0% in dev (no noise).
  tracesSampleRate: isProd ? 0.1 : 0,

  // Send console.error / console.warn as breadcrumbs + capture explicit Sentry calls.
  // Keep `false` to avoid duplicate noise from console-only logs.
  enableLogs: false,

  // We DO NOT auto-send IPs, cookies, or headers — risk of leaking Supabase session
  // tokens, Stripe keys, etc. We attach user context manually via Sentry.setUser when needed.
  sendDefaultPii: false,

  // Active when the DSN is configured. To silence locally, comment out
  // NEXT_PUBLIC_SENTRY_DSN in .env.local.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  beforeSend(event) {
    // Strip auth headers if anything slips through.
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }
    return event;
  },
});
