import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const E2E_EMAIL = process.env.E2E_EMAIL ?? "madro-e2e@madro.test";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

const SUPABASE_URL = "https://rtkktiywjcwglwzebchx.supabase.co";
const ANON_KEY = "sb_publishable_55_8DZ95lSsehU3o7uvkKA_ch9NT-jb";

/** Log ind gennem UI'et (password-fanen). */
export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: /adgangskode/i }).click();
  await page.locator("#login-email").fill(E2E_EMAIL);
  await page.locator("#login-password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /^log ind$/i }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "I dag" })).toBeVisible();
}

/**
 * Defensiv oprydning før/efter tests: sletter e2e-brugerens egne
 * log_entries og scans via PostgREST (RLS afgrænser til egne rækker).
 */
export async function cleanupOwnData(request: APIRequestContext): Promise<void> {
  const tokenResponse = await request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    },
  );
  if (!tokenResponse.ok()) return;
  const { access_token } = (await tokenResponse.json()) as { access_token: string };
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${access_token}`,
  };
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
