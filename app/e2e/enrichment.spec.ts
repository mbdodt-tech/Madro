import { expect, test } from "@playwright/test";
import { cleanupOwnData, e2eSession, login, SUPABASE_URL } from "./helpers";

// Verificeret-opslag-kobling (2026-07-08, blåbær-testfundet): en egen vare
// uden mikroværdier kan suppleres fra Frida direkte i dagbogsarket.
// Testdata oprettes via PostgREST som e2e-brugeren selv (RLS: egne rækker)
// og ryddes op bagefter — samme mønster som kerneløkken.

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

test("verificeret opslag: tom egen vare får næringstal fra Frida", async ({
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

  // --- Opsætning: tom custom-vare + dagbogspost (som appen selv ville) ---
  const foodResponse = await request.post(`${SUPABASE_URL}/rest/v1/foods`, {
    headers: jsonHeaders,
    data: {
      source: "custom",
      data_quality: "user",
      owner_id: session!.userId,
      name: "Blåbær e2e-test",
      nutriments: { energy_kcal: 50 },
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
      amount: 25,
      unit: "g",
      meal: "breakfast",
      consumed_at: new Date().toISOString(),
    },
  });
  expect(entryResponse.ok()).toBeTruthy();

  // --- Flowet: åbn posten → hent fra verificeret opslag → vælg Frida ---
  await login(page);
  await page.getByRole("button", { name: /blåbær e2e-test/i }).click();
  await expect(page.getByText("Varen mangler mikroværdier.")).toBeVisible();
  await page.getByRole("button", { name: /hent fra verificeret opslag/i }).click();
  await page.getByRole("button", { name: /blåbær, rå/i }).click();
  await expect(
    page.getByText("Næringstal hentet fra verificeret kilde").first(),
  ).toBeVisible({ timeout: 15_000 });

  // --- Varen har nu mikroværdier: hintet er væk ved genåbning ---
  await page.getByRole("button", { name: /blåbær e2e-test/i }).click();
  await expect(page.getByText("Varen mangler mikroværdier.")).toBeHidden();
});
