import { expect, test } from "@playwright/test";
import { cleanupOwnData, login } from "./helpers";

// Beta-prøven (2026-07-09): paywall-CTA'en aktiverer premium på egen
// profilrække; fra-knappen ruller tilbage. Testen efterlader e2e-brugeren
// UDEN premium, så gate-antagelserne i andre tests holder.

test.beforeEach(async ({ request }) => {
  await cleanupOwnData(request);
});

test("beta-prøve: aktivér → skriv-fanen åbner → deaktivér", async ({ page }) => {
  await login(page);
  await page.goto("/premium");

  // Robusthed: hvis en tidligere kørsel efterlod premium tændt, sluk først.
  // Vent på at EN af tilstandene er renderet — isVisible() venter ikke selv.
  const cta = page.getByRole("button", { name: /gratis prøve/i });
  const deactivate = page.getByRole("button", { name: /slå beta-premium fra/i });
  await expect(cta.or(deactivate).first()).toBeVisible({ timeout: 15_000 });
  if (await deactivate.isVisible()) {
    await deactivate.click();
    await expect(cta).toBeVisible({ timeout: 15_000 });
  }

  // --- Aktivér prøven ---
  await cta.click();
  await expect(page.getByText("Prøven er aktiv — god fornøjelse").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(deactivate).toBeVisible();

  // --- Gaten er åben: skriv-fanen viser editoren, ikke teaseren ---
  await page.goto("/");
  await page.getByRole("button", { name: /^tilføj måltid$/i }).click();
  await page.getByRole("tab", { name: /skriv/i }).click();
  await expect(page.locator("#write-meal")).toBeVisible();
  await expect(page.getByText("En del af Premium")).toBeHidden();
  await page.keyboard.press("Escape");

  // --- Deaktivér igen (oprydning: e2e-brugeren skal forblive gratis) ---
  await page.goto("/premium");
  await deactivate.click();
  await expect(page.getByText("Beta-premium er slået fra").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: /gratis prøve/i })).toBeVisible();
});
