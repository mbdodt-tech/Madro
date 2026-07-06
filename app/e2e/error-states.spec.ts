import { expect, test } from "@playwright/test";
import { cleanupOwnData, login } from "./helpers";

// Fejlstier (fase-tjekliste 1.8): ukendt stregkode = ærligt miss;
// offline = fejltilstand med "Prøv igen" — ALDRIG forvekslet med tom dag.

const UNKNOWN_BARCODE = "4999999999999"; // bekræftet fraværende i OFF (status 0)
const KIMS_PEANUTS = "5701979011107";

test.beforeEach(async ({ request }) => {
  await cleanupOwnData(request);
});

test("ukendt stregkode → fallback kører → ærligt miss-ark med navnesøgning", async ({
  page,
}) => {
  await login(page);
  await page.goto("/scan");
  await page.locator("#manual-barcode").fill(UNKNOWN_BARCODE);
  await page.getByRole("button", { name: /slå op/i }).click();

  // Fallbacken spørger OFF server-side; derefter ærligt miss.
  await expect(page.getByText(/ikke i vores database endnu/i)).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator("#miss-search")).toBeVisible();
});

test("offline: scan-opslag viser fejl (ikke miss), og dagbogen viser fejlkort (ikke tom dag)", async ({
  page,
  context,
}) => {
  await login(page);

  // --- Scan-opslag offline → fejltilstand med Prøv igen ---
  await page.goto("/scan");
  await page.locator("#manual-barcode").fill(KIMS_PEANUTS);
  await context.setOffline(true);
  await page.getByRole("button", { name: /slå op/i }).click();
  await expect(page.getByText(/opslaget mislykkedes/i)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/ikke i vores database/i)).toBeHidden();

  // --- Online igen: Prøv igen fører hele vejen til verdikt-arket ---
  await context.setOffline(false);
  await page.getByRole("button", { name: /^prøv igen$/i }).click();
  await expect(page.getByText("81/100")).toBeVisible({ timeout: 15_000 });

  // --- Dagbogen offline → fejlkort, ikke tom tilstand ---
  await page.goto("/diary");
  await expect(
    page.getByText(/ingen måltider|noget gik galt/i).first(),
  ).toBeVisible({ timeout: 15_000 });
  await context.setOffline(true);
  await page.getByRole("button", { name: /forrige dag/i }).click();
  await expect(page.getByText(/noget gik galt/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/ingen måltider logget/i)).toBeHidden();

  // --- Online igen → React Query refetcher selv ved reconnect,
  // og den normale (tomme) tilstand vender tilbage uden klik ---
  await context.setOffline(false);
  await expect(page.getByText(/ingen måltider logget/i)).toBeVisible({
    timeout: 15_000,
  });
});
