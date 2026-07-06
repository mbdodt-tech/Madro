import { expect, test } from "@playwright/test";
import { cleanupOwnData, login } from "./helpers";

// Kerneløkken (fase-tjekliste 1.8): login → scan (manuel kode) → verdikt →
// log m. præcis gram → Dagbog → redigér → "I dag" opdateret → slet.
// Bruger den delte e2e-bruger og efterlader den ren.

const KIMS_PEANUTS = "5701979011107"; // kendt hit: verdikt 81/100

test.beforeEach(async ({ request }) => {
  await cleanupOwnData(request);
});

test.afterAll(async ({ request }) => {
  await cleanupOwnData(request);
});

test("kerneløkken: scan → verdikt → log → dagbog → redigér → i dag → slet", async ({
  page,
}) => {
  await login(page);

  // --- Scan via manuel stregkode (kamera findes ikke i headless) ---
  await page.getByRole("button", { name: /scan/i }).click();
  await page.waitForURL("/scan");
  await page.locator("#manual-barcode").fill(KIMS_PEANUTS);
  await page.getByRole("button", { name: /slå op/i }).click();

  // --- Verdikt-arket ---
  await expect(page.getByText("81/100")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /jeg spiste det/i }).click();

  // --- Præcis gram-indtastning (137 g) + log ---
  const grams = page.locator("[role=dialog] input[inputmode=numeric]");
  await grams.fill("137");
  await grams.press("Enter");
  await page.getByRole("button", { name: /^log måltid$/i }).click();
  await expect(page.getByText("Logget i din dagbog").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForURL("/");

  // --- "I dag" er opdateret med det samme (invalidateDiary efter log) ---
  await expect(page.getByText(/peanuts/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/\d+ \/ \d[\d.]* kcal/)).toBeVisible();
  await expect(page.getByText("ikke-ultraforarbejdet")).toBeVisible();

  // --- Dagbogen viser posten med 137 g ---
  await page.getByRole("button", { name: /^dagbog$/i }).click();
  await page.waitForURL("/diary");
  await expect(page.getByText("137 g")).toBeVisible({ timeout: 15_000 });

  // --- Redigér: 200 g + frokost ---
  await page.getByRole("button", { name: /peanuts/i }).click();
  const editGrams = page.locator("[role=dialog] input[inputmode=numeric]");
  await editGrams.fill("200");
  await editGrams.press("Enter");
  await page.getByRole("button", { name: /^frokost$/i }).click();
  await page.getByRole("button", { name: /gem ændringer/i }).click();
  await expect(page.getByText("Ændringen er gemt").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("200 g")).toBeVisible();
  await expect(page.getByRole("heading", { name: /^frokost$/i })).toBeVisible();

  // --- Slet med to-trins bekræftelse → tom tilstand ---
  await page.getByRole("button", { name: /peanuts/i }).click();
  await page.getByRole("button", { name: /fjern fra dagbogen/i }).click();
  await page.getByRole("button", { name: /ja, fjern/i }).click();
  await expect(page.getByText("Posten er fjernet").first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/ingen måltider logget/i)).toBeVisible();
});
