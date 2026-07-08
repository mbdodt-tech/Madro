import { expect, test } from "@playwright/test";
import { cleanupOwnData, e2eSession, login, SUPABASE_URL } from "./helpers";

// Skift opslag (2026-07-08): en post kan bytte sin fødevare til et andet
// opslag i biblioteket (fx OFF-vare uden mikrodata → Fridas verificerede
// pendant) med bevaret mængde og måltid. Testdata via PostgREST (RLS).

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

test("skift opslag: posten bytter til Frida-opslag, mængden beholdes", async ({
  page,
  request,
}) => {
  const session = await e2eSession(request);
  expect(session).not.toBeNull();
  const jsonHeaders = {
    ...session!.headers,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const foodResponse = await request.post(`${SUPABASE_URL}/rest/v1/foods`, {
    headers: jsonHeaders,
    data: {
      source: "custom",
      data_quality: "user",
      owner_id: session!.userId,
      name: "Skyr e2e-swaptest",
      nutriments: { energy_kcal: 60 },
    },
  });
  expect(foodResponse.ok()).toBeTruthy();
  const [food] = (await foodResponse.json()) as { id: string }[];
  expect(food).toBeDefined();
  foodId = food!.id;

  const entryResponse = await request.post(`${SUPABASE_URL}/rest/v1/log_entries`, {
    headers: jsonHeaders,
    data: {
      user_id: session!.userId,
      food_id: food!.id,
      amount: 150,
      unit: "g",
      meal: "breakfast",
      consumed_at: new Date().toISOString(),
    },
  });
  expect(entryResponse.ok()).toBeTruthy();

  // --- Flowet: åbn posten → skift opslag → søg → vælg Frida-blåbær ---
  await login(page);
  await page.getByRole("button", { name: /skyr e2e-swaptest/i }).click();
  await page.getByRole("button", { name: /skift til andet opslag/i }).click();
  await page.locator("#entry-swap-search").fill("blåbær, rå");
  await page.getByRole("button", { name: /blåbær, rå/i }).click();
  await expect(page.getByText("Skiftet til andet opslag").first()).toBeVisible({
    timeout: 15_000,
  });

  // --- Posten viser nu det nye opslag med bevaret mængde ---
  await expect(
    page.getByRole("button", { name: /blåbær, rå/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("150 g")).toBeVisible();
});
