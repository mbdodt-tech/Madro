import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "madro-e2e@madro.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

export const SUPABASE_URL = "https://rtkktiywjcwglwzebchx.supabase.co";
const ANON_KEY = "sb_publishable_55_8DZ95lSsehU3o7uvkKA_ch9NT-jb";

/** Log ind gennem UI'et (password-fanen). */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /adgangskode/i }).click();
  await page.locator("#login-email").fill(E2E_EMAIL);
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^log ind$/i }).click();
  await page.waitForURL("/");
  await expect(
    page.getByRole("heading", { name: "I dag", exact: true }),
  ).toBeVisible();
}

/**
 * PostgREST-session som e2e-brugeren: headers til REST-kald og bruger-id.
 * RLS afgrænser alle kald til brugerens egne rækker.
 */
export async function e2eSession(
  request: APIRequestContext,
): Promise<{ headers: Record<string, string>; userId: string } | null> {
  const tokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    },
  );
  if (!tokenResponse.ok()) return null;
  const { access_token, user } = (await tokenResponse.json()) as {
    access_token: string;
    user: { id: string };
  };
  return {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${access_token}` },
    userId: user.id,
  };
}

/**
 * Defensiv oprydning før/efter tests: sletter e2e-brugerens egne
 * log_entries og scans via PostgREST (RLS afgrænser til egne rækker).
 */
export async function cleanupOwnData(request: APIRequestContext): Promise<void> {
  const session = await e2eSession(request);
  if (!session) return;
  const { headers } = session;
  // Filter kræves af PostgREST; RLS begrænser alligevel til egne rækker.
  await request.delete(
    `${SUPABASE_URL}/rest/v1/log_entries?consumed_at=gt.1970-01-01`,
    { headers },
  );
  await request.delete(
    `${SUPABASE_URL}/rest/v1/scans?created_at=gt.1970-01-01`,
    { headers },
  );
}
