// CORS-template for ALLE Edge Functions (CLAUDE.md-regel: aldrig en
// funktion uden CORS-headers + OPTIONS-preflight).
//
// Tilladte origins: lokal udvikling + Vercel (previews og prod).
// Udvid ALLOWED_PATTERNS når et rigtigt domæne kommer til (Fase 0.7+).

const ALLOWED_PATTERNS: RegExp[] = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/,
];

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_PATTERNS.some((p) => p.test(origin));
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}),
    Vary: "Origin",
  };
}

/** Håndtér OPTIONS-preflight. Returnér altid dette før al anden logik. */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export function jsonResponse(
  req: Request,
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}
