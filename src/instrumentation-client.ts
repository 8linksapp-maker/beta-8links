// Sentry initialization for the browser. Loaded on every page.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProd ? 0.1 : 0,
  enableLogs: false,
  sendDefaultPii: false,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  beforeSend(event) {
    // Drop browser-extension noise (common false positives).
    const stack = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    if (stack.some((f) => /chrome-extension|moz-extension|safari-extension/.test(f.filename ?? ""))) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
