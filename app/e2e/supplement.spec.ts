import { expect, test } from "@playwright/test";
import { cleanupOwnData, e2eSession, login, SUPABASE_URL } from "./helpers";

// Vitamintabletter (2026-07-08, brugerønske): et kosttilskud scannes og
// logges i tabletter (1 tablet = 1 g-konventionen). Testdata via
// PostgREST som e2e-brugeren selv; barcoden er reserveret til testen.

const TEST_BARCODE = "5709999999992";

let foodId: string | null = null;

test.beforeEach(async ({ request }) => {
  await cleanupOwnData(request);
});

test.afterAll(async ({ request }) => {
  await cleanupOwnData(request);
  const session = await e2eSession(request);
  if (session && foodId) {
    await request.delete(`${SUPABASE_URL}/rest/v1/foods?id=eq.${foodId}`, {
      headers: session.headers,
    });
  }
});

test("kosttilskud: scan → tabletvælger → 2 tabletter i dagbogen", async ({
  page,
  request,
}) => {
  const session = await e2eSession(request);
  expect(session).not.toBeNull();

  // --- Opsætning: eget kosttilskud med stregkode (38 µg D pr. tablet) ---
  const foodResponse = await request.post(`${SUPABASE_URL}/rest/v1/foods`, {
    headers: {
      ...session!.headers,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: {
      source: "custom",
      data_quality: "user",
      owner_id: session!.userId,
      barcode: TEST_BARCODE,
      name: "D-vitamin e2e-test",
      categories: ["en:dietary-supplements"],
      nutriments: { vitamin_d_ug: 3800 },
    },
  });
  expect(foodResponse.ok()).toBeTruthy();
  const [food] = (await foodResponse.json()) as { id: string }[];
  expect(food).toBeDefined();
  foodId = food!.id;

  // --- Scan via manuel stregkode → verdikt-ark → "Jeg spiste det" ---
  await login(page);
  await page.getByRole("button", { name: /scan/i }).click();
  await page.waitForURL("/scan");
  await page.locator("#manual-barcode").fill(TEST_BARCODE);
  await page.getByRole("button", { name: /slå op/i }).click();
  await page
    .getByRole("button", { name: /jeg spiste det/i })
    .click({ timeout: 15_000 });

  // --- Portionstrinnet står i tabletter: 1 tablet → +1 → 2 tabletter ---
  const dialog = page.locator("[role=dialog]");
  await expect(dialog.getByText("tablet", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: /større portion/i }).click();
  await expect(dialog.getByText("tabletter", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^log måltid$/i }).click();
  await expect(page.getByText("Logget i din dagbog").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForURL("/");

  // --- Dagens log viser posten i tabletter ---
  await expect(page.getByText("2 tabletter")).toBeVisible({ timeout: 15_000 });
});
