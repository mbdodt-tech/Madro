import * as Sentry from "@sentry/react";

/**
 * Sentry er slået fra uden DSN (lokal udvikling). GDPR-regler:
 * ingen kostdata, ingen PII — vi sender aldrig request-bodies,
 * og breadcrumbs for fetch/xhr fjernes helt.
 */
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeBreadcrumb(breadcrumb) {
      // Netværks-breadcrumbs kan indeholde Supabase-URL'er med filtre
      // (= kostdata). Drop dem helt.
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        return null;
      }
      return breadcrumb;
    },
  });
}
