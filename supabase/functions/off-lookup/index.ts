// OFF-fallback ved cache-miss (godkendt regelændring 2026-07-05, se
// CLAUDE.md + docs/data.md): cache-FØRST er stadig loven — denne
// funktion kaldes kun ved miss, henter ÉN vare fra OFF's API
// (server-side, med User-Agent jf. OFF's API-regler), skriver den ind
// i vores egen foods-tabel og returnerer den. Næste scan rammer cachen.
//
// GDPR: logger kun stregkode-udfald (hit/miss), aldrig brugerdata.

import { createClient } from "npm:@supabase/supabase-js@2.47.10";
import { z } from "npm:zod@3.23.8";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

const USER_AGENT = "Madro/0.1 (https://madro.vercel.app; mbdodt@gmail.com)";
const RATE_LIMIT_PER_MINUTE = 30;

const bodySchema = z.object({
  barcode: z.string().regex(/^\d{4,14}$/),
});

/** OFF API-nutriments (allerede pr. 100 g, gram-normaliseret) → kanoniske nøgler. */
const NUTRIMENT_MAP: Record<string, { key: string; factor: number }> = {
  "energy-kcal_100g": { key: "energy_kcal", factor: 1 },
  proteins_100g: { key: "protein_g", factor: 1 },
  carbohydrates_100g: { key: "carbohydrate_g", factor: 1 },
  sugars_100g: { key: "sugars_g", factor: 1 },
  fat_100g: { key: "fat_g", factor: 1 },
  "saturated-fat_100g": { key: "saturated_fat_g", factor: 1 },
  fiber_100g: { key: "fiber_g", factor: 1 },
  salt_100g: { key: "salt_g", factor: 1 },
  sodium_100g: { key: "sodium_mg", factor: 1000 },
  "vitamin-a_100g": { key: "vitamin_a_re_ug", factor: 1_000_000 },
  "vitamin-c_100g": { key: "vitamin_c_mg", factor: 1000 },
  "vitamin-d_100g": { key: "vitamin_d_ug", factor: 1_000_000 },
  "vitamin-e_100g": { key: "vitamin_e_mg", factor: 1000 },
  "vitamin-b1_100g": { key: "thiamin_mg", factor: 1000 },
  "vitamin-b2_100g": { key: "riboflavin_mg", factor: 1000 },
  "vitamin-b6_100g": { key: "vitamin_b6_mg", factor: 1000 },
  "vitamin-b9_100g": { key: "folate_ug", factor: 1_000_000 },
  "vitamin-b12_100g": { key: "vitamin_b12_ug", factor: 1_000_000 },
  calcium_100g: { key: "calcium_mg", factor: 1000 },
  iron_100g: { key: "iron_mg", factor: 1000 },
  magnesium_100g: { key: "magnesium_mg", factor: 1000 },
  potassium_100g: { key: "potassium_mg", factor: 1000 },
  zinc_100g: { key: "zinc_mg", factor: 1000 },
  selenium_100g: { key: "selenium_ug", factor: 1_000_000 },
  iodine_100g: { key: "iodine_ug", factor: 1_000_000 },
  phosphorus_100g: { key: "phosphorus_mg", factor: 1000 },
};

interface OffApiProduct {
  code?: string;
  product_name?: string;
  product_name_da?: string;
  product_name_en?: string;
  brands?: string;
  categories_tags?: string[];
  nutriments?: Record<string, unknown>;
  nova_group?: number;
  nutriscore_grade?: string;
  additives_tags?: string[];
  ingredients_text_da?: string;
  ingredients_text_en?: string;
  ingredients_text?: string;
  allergens_tags?: string[];
  image_front_url?: string;
}

function transform(barcode: string, p: OffApiProduct) {
  const name = (p.product_name_da || p.product_name || p.product_name_en || "").trim();
  if (!name) return null;

  const nutriments: Record<string, number> = {};
  for (const [offKey, m] of Object.entries(NUTRIMENT_MAP)) {
    const v = p.nutriments?.[offKey];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      nutriments[m.key] = Math.round(v * m.factor * 1000) / 1000;
    }
  }
  if (nutriments.salt_g == null && nutriments.sodium_mg != null) {
    nutriments.salt_g = Math.round(nutriments.sodium_mg * 2.5) / 1000;
  }

  const grade = p.nutriscore_grade?.toLowerCase();
  return {
    source: "off",
    data_quality: "crowdsourced",
    source_ref: barcode,
    barcode,
    name: name.slice(0, 500),
    brand: p.brands?.trim().slice(0, 200) || null,
    categories: (p.categories_tags ?? []).slice(0, 50),
    nova_group:
      p.nova_group != null && p.nova_group >= 1 && p.nova_group <= 4
        ? p.nova_group
        : null,
    nutriscore: grade && ["a", "b", "c", "d", "e"].includes(grade) ? grade : null,
    additives: (p.additives_tags ?? []).slice(0, 100),
    ingredients_text:
      (p.ingredients_text_da || p.ingredients_text || p.ingredients_text_en)
        ?.slice(0, 5000) ?? null,
    allergens: (p.allergens_tags ?? []).slice(0, 50),
    nutriments,
    image_url: p.image_front_url ?? null,
  };
}

function error(req: Request, status: number, code: string): Response {
  return jsonResponse(req, status, { error: { code } });
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return error(req, 405, "method_not_allowed");

  // Auth
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return error(req, 401, "unauthorized");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
  if (userError || !userData.user) return error(req, 401, "unauthorized");
  const userId = userData.user.id;

  // Body
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return error(req, 400, "invalid_body");
  }
  const { barcode } = parsed;

  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Rate limit (deler ai_requests-tabellen; task-kolonnen adskiller)
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await serviceClient
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("task", "off_lookup")
    .gte("created_at", oneMinuteAgo);
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return error(req, 429, "rate_limited");
  }
  await serviceClient
    .from("ai_requests")
    .insert({ user_id: userId, task: "off_lookup" });

  // Race-sikkerhed: er varen kommet i cachen siden klientens miss?
  const { data: cached } = await serviceClient
    .from("foods")
    .select("*")
    .eq("barcode", barcode)
    .limit(1);
  if (cached && cached.length > 0) {
    return jsonResponse(req, 200, { data: cached[0] });
  }

  // Ét OFF-opslag, server-side
  const offResponse = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=code,product_name,product_name_da,product_name_en,brands,categories_tags,nutriments,nova_group,nutriscore_grade,additives_tags,ingredients_text_da,ingredients_text_en,ingredients_text,allergens_tags,image_front_url`,
    { headers: { "User-Agent": USER_AGENT } },
  );
  if (!offResponse.ok) {
    console.warn(`off-lookup barcode=${barcode} outcome=off_http_${offResponse.status}`);
    return error(req, 502, "off_unavailable");
  }
  const off = (await offResponse.json()) as {
    status: number;
    product?: OffApiProduct;
  };
  if (off.status !== 1 || !off.product) {
    console.info(`off-lookup barcode=${barcode} outcome=not_found`);
    return jsonResponse(req, 404, { error: { code: "not_found" } });
  }

  const row = transform(barcode, off.product);
  if (!row) {
    console.info(`off-lookup barcode=${barcode} outcome=unusable`);
    return jsonResponse(req, 404, { error: { code: "not_found" } });
  }

  // Plain insert — unikke-nøglen (source, source_ref) er et PARTIELT
  // indeks, som PostgREST's upsert ikke kan inferere. Taber vi et race
  // mod et andet samtidigt opslag (23505), læser vi bare vinderen.
  let { data: inserted, error: insertError } = await serviceClient
    .from("foods")
    .insert(row)
    .select()
    .single();
  if (insertError?.code === "23505") {
    ({ data: inserted, error: insertError } = await serviceClient
      .from("foods")
      .select("*")
      .eq("source", "off")
      .eq("source_ref", barcode)
      .single());
  }
  if (insertError || !inserted) {
    console.error(`off-lookup barcode=${barcode} outcome=insert_failed code=${insertError?.code}`);
    return error(req, 500, "internal");
  }

  console.info(`off-lookup barcode=${barcode} outcome=cached`);
  return jsonResponse(req, 200, { data: inserted });
});
