// AI-gateway (fase-tjekliste 0.6) — ENESTE indgang til Anthropic API.
// Pipeline: preflight → auth → envelope-validering → rate-limit → task.
// GDPR-regel: payload-indhold logges ALDRIG (kun task-navn, bruger-id, udfald).

import { createClient } from "npm:@supabase/supabase-js@2.47.10";
import { z } from "npm:zod@3.23.8";
import { askClaude } from "../_shared/anthropic.ts";
import { handlePreflight, jsonResponse } from "../_shared/cors.ts";

const RATE_LIMIT_PER_MINUTE = 20;

const envelopeSchema = z.object({
  task: z.string().min(1).max(64),
  payload: z.unknown(),
});

// ---- parse_meal (fase 2.1): måltidsbeskrivelse → poster ----
// Skemaet spejler aiResultSchemas.parse_meal i packages/core/src/ai.ts.
const parseMealPayload = z.object({
  text: z.string().min(3).max(500),
  locale: z.enum(["da", "en"]),
});

const mealItemSchema = z.object({
  name: z.string().min(1).max(80),
  grams: z.number().min(1).max(2000),
  note: z.string().max(120).optional(),
});

const parseMealResult = z.object({
  items: z.array(mealItemSchema).min(1).max(8),
});

/** Foto-varianten tillader 0 items (= ingen mad genkendt, ærligt svar). */
const parsePhotoMealResult = z.object({
  items: z.array(mealItemSchema).max(8),
});

// Foto-payload (3.4): valgfrie kalibrerings-hints afledt af brugerens
// EGNE tidligere rettelser (kun aggregeret tekst — aldrig billeder/fritekst).
const parsePhotoMealPayload = z.object({
  image_base64: z.string().min(100).max(2_800_000),
  media_type: z.enum(["image/jpeg", "image/png"]),
  locale: z.enum(["da", "en"]),
  hints: z.array(z.string().min(1).max(200)).max(5).optional(),
});

// ---- parse_label (fase 2.3): foto af varedeklaration → varedata ----
// Skemaet spejler aiResultSchemas.parse_label i packages/core/src/ai.ts.
// Billedet persisteres og logges ALDRIG.
const parseLabelPayload = z.object({
  image_base64: z.string().min(100).max(2_800_000),
  media_type: z.enum(["image/jpeg", "image/png"]),
  locale: z.enum(["da", "en"]),
});

const parseLabelResult = z.object({
  name: z.string().min(1).max(200).optional(),
  brand: z.string().min(1).max(120).optional(),
  ingredients_text: z.string().max(4000).optional(),
  additives: z.array(z.string().regex(/^e\d{3,4}[a-z]?$/)).max(40).default([]),
  nova_group: z.number().int().min(1).max(4).optional(),
  nutriments: z
    .object({
      energy_kcal: z.number().min(0).max(950).optional(),
      fat_g: z.number().min(0).max(100).optional(),
      saturated_fat_g: z.number().min(0).max(100).optional(),
      carbohydrate_g: z.number().min(0).max(100).optional(),
      sugars_g: z.number().min(0).max(100).optional(),
      fiber_g: z.number().min(0).max(100).optional(),
      protein_g: z.number().min(0).max(100).optional(),
      salt_g: z.number().min(0).max(100).optional(),
    })
    .default({}),
});

const PARSE_LABEL_SYSTEM = `Opgave: Aflæs varedeklarationen (ingrediensliste og/eller næringsdeklaration) på billedet.
- Returnér JSON: { "name"?, "brand"?, "ingredients_text"?, "additives": [..],
  "nova_group"?, "nutriments": {..} }.
- "additives": alle E-numre fra ingredienslisten, normaliseret småt uden mellemrum
  (fx "e330", "e160a"). Genkend også navngivne tilsætningsstoffer med kendt E-nummer
  (fx "citronsyre" → "e330").
- "nova_group": skøn 1-4 EFTER NOVA-kriterierne ud fra ingredienslisten
  (fx: kun én råvare → 1; industrielle ingredienser som glukosesirup,
  modificeret stivelse, aromaer, emulgatorer → 4). Udelad feltet, hvis
  ingredienslisten ikke kan læses.
- "nutriments": tallene PR. 100 g præcis som deklareret (energy_kcal, fat_g,
  saturated_fat_g, carbohydrate_g, sugars_g, fiber_g, protein_g, salt_g).
  Deklareres kun pr. portion, omregn ikke — udelad feltet.
- Medtag KUN hvad der faktisk kan læses på billedet. Gæt aldrig.
- Kan intet af ovenstående læses, returnér {"additives":[],"nutriments":{}}.`;

// ---- rank_alternatives (fase 2.5): bedre alternativer m. begrundelse ----
// Kandidaterne er ALLEREDE filtreret til højere verdikt-score i klienten.
const rankAlternativesPayload = z.object({
  locale: z.enum(["da", "en"]),
  product: z.object({
    name: z.string().min(1).max(200),
    score: z.number().min(0).max(100),
  }),
  weeklyGaps: z
    .array(z.object({ name: z.string().min(1).max(60), pct: z.number().min(0).max(500) }))
    .max(3),
  candidates: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200),
        brand: z.string().max(120).optional(),
        score: z.number().min(0).max(100),
        novaGroup: z.number().int().min(1).max(4).optional(),
        nutriscore: z.string().max(1).optional(),
        gapNutrients: z.record(z.string(), z.number()).optional(),
      }),
    )
    .min(2)
    .max(8),
});

const rankAlternativesResult = z.object({
  picks: z
    .array(z.object({ id: z.string().uuid(), reason: z.string().min(1).max(200) }))
    .min(1)
    .max(3),
});

const RANK_ALTERNATIVES_SYSTEM = `Opgave: Vælg de bedste alternativer til en scannet vare.
- Returnér JSON: {"picks":[{"id","reason"}]} — 2-3 valg (1 hvis kun ét skiller sig ud).
- Alle kandidater har allerede HØJERE kvalitetsscore end varen; vælg dem der
  bedst kombinerer kvalitet (score, NOVA, Nutri-Score) med brugerens ugentlige
  mangler (weeklyGaps + kandidaternes gapNutrients pr. 100 g).
- "reason": ÉN kort, saglig sætning på det angivne sprog, fx
  "Bedre Nutri-Score og et solidt bidrag af jern".
- Omtal ALDRIG den oprindelige vare nedladende, og brug aldrig skyld-sprog.
- "id" skal være et id fra kandidatlisten.`;

// ---- weekly_insight (fase 2.4): ugens tal → fortælling + forslag ----
// Payload er KUN tal/navne fra daily_summaries — aldrig brugerfritekst.
const weeklyInsightPayload = z.object({
  locale: z.enum(["da", "en"]),
  stats: z.object({
    daysLogged: z.number().int().min(0).max(7),
    avgKcal: z.number().min(0).max(10000).optional(),
    avgNovaShare: z.number().min(0).max(100).optional(),
    avgProteinG: z.number().min(0).max(500).optional(),
    lowestMicros: z
      .array(z.object({ name: z.string().min(1).max(60), pct: z.number().min(0).max(500) }))
      .max(3),
  }),
});

const weeklyInsightResult = z.object({
  narrative: z.string().min(1).max(600),
  suggestions: z
    .array(
      z.object({
        food: z.string().min(1).max(80),
        reason: z.string().min(1).max(200),
      }),
    )
    .max(4),
});

const WEEKLY_INSIGHT_SYSTEM = `Opgave: Skriv ugens kost-indsigt ud fra talgrundlaget.
- Returnér JSON: {"narrative": string, "suggestions": [{"food","reason"}]}.
- "narrative": 2-4 korte sætninger i almindeligt sprog på det angivne sprog.
  Rammen er ALTID "sådan spiser du endnu bedre" — beskriv mønstre neutralt og
  fremadrettet. ALDRIG bebrejdelse, aldrig "for meget", "du burde", "desværre"
  eller lignende. Omtal forarbejdningsgrad via NOVA ("andelen af
  ikke-ultraforarbejdet mad var X %").
- Nævn KUN kalorier, hvis avgKcal er med i talgrundlaget.
- "suggestions": 2-4 konkrete fødevarer, der naturligt løfter de laveste
  mikronæringsstoffer, med en kort, saglig grund (gerne "rig på jern" o.l.).
- Ved få loggede dage (daysLogged < 3): anerkend roligt at ugen er
  sparsomt logget, og hold fortællingen kort.`;

const PARSE_PHOTO_MEAL_SYSTEM = `Opgave: Genkend maden på billedet (et måltid uden stregkode).
- Returnér JSON: {"items":[{"name":string,"grams":number,"note":string?}]} — 0-8 poster.
- "name": ret/fødevare, kort og opslagsvenligt på det angivne sprog
  (fx "frikadelle", "kogte kartofler", "agurkesalat").
- "grams": skøn portionen i gram ud fra tallerkenstørrelse og kontekst
  (typisk hovedret i alt 300-500 g fordelt på komponenterne). Standardmål:
  1 skive brød ≈ 45 g, 1 æg ≈ 60 g, 1 stk frugt ≈ 130 g, 1 portion kogt
  ris ≈ 150 g, 1 portion kogt pasta ≈ 180 g.
- "note": kort, fx "2 stk" eller "ca. ½ tallerken".
- Er maden tydeligt stegt, friteret eller paneret, SKAL tilberedningsfedtet
  med som sin egen post, fx {"name":"olie","grams":10,"note":"stegning (estimat)"}
  — aldrig indbagt i rettens gram.
- Medtag ellers KUN hvad der faktisk kan ses. Usynlig sauce/dressing
  tilføjer brugeren selv bagefter — gæt ikke på dem.
- Følger der kalibrerings-hints med (afledt af brugerens egne tidligere
  rettelser), så justér estimaterne diskret i den retning. Nævn ALDRIG
  hints eller tidligere rettelser i svaret.
- Er der ingen mad på billedet, returnér {"items":[]}.`;

const PARSE_MEAL_SYSTEM = `Opgave: Parsér en måltidsbeskrivelse til enkeltposter.
- Returnér JSON på formen {"items":[{"name":string,"grams":number,"note":string?}]}.
- "name": fødevarens navn på beskrivelsens sprog, kort og opslagsvenligt
  (fx "rugbrød", ikke "to skiver dejligt rugbrød").
- "grams": skønnet portion i gram. Brug almindelige danske husholdningsmål:
  1 skive rugbrød ≈ 50 g, 1 skive franskbrød ≈ 30 g, 1 skive ost ≈ 20 g,
  1 stk frugt (æble/banan/pære) ≈ 130 g, 1 æg ≈ 60 g, 1 spsk ≈ 15 g
  (olie/smør ≈ 14 g), 1 tsk ≈ 5 g, 1 glas ≈ 200 g, 1 dl ≈ 100 g,
  1 håndfuld ≈ 30 g, 1 portion kogt ris ≈ 150 g, 1 portion kogt
  pasta ≈ 180 g, 1 generisk portion ≈ 250 g.
- Nævnes stegt/friteret/paneret mad, SKAL tilberedningsfedtet med som sin
  egen post, fx {"name":"olie","grams":10,"note":"stegning (estimat)"} —
  aldrig indbagt i rettens gram.
- "note": valgfrit, kort — fx mængdeangivelsen fra beskrivelsen ("2 skiver").
- 1-8 poster. Ingredienser nævnt sammen ("rugbrød med ost") deles i separate poster.`;

/** Task-registret: zod-skema for payload + handler. */
const tasks: Record<
  string,
  {
    schema: z.ZodType<unknown>;
    handler: (payload: unknown, userId: string) => Promise<unknown>;
  }
> = {
  ping: {
    schema: z.object({}).strict(),
    handler: () => Promise.resolve({ pong: true, time: new Date().toISOString() }),
  },
  parse_meal: {
    schema: parseMealPayload,
    handler: async (payload) => {
      const { text, locale } = payload as z.infer<typeof parseMealPayload>;
      return askClaude({
        system: PARSE_MEAL_SYSTEM,
        user: `Sprog: ${locale}\nMåltidsbeskrivelse: ${text}`,
        schema: parseMealResult,
        maxTokens: 1024,
      });
    },
  },
  parse_label: {
    schema: parseLabelPayload,
    handler: async (payload) => {
      const { image_base64, media_type, locale } =
        payload as z.infer<typeof parseLabelPayload>;
      return askClaude({
        system: PARSE_LABEL_SYSTEM,
        user: `Sprog: ${locale}. Aflæs varedeklarationen på billedet.`,
        imageBase64: image_base64,
        imageMediaType: media_type,
        schema: parseLabelResult,
        maxTokens: 2048,
      });
    },
  },
  parse_photo_meal: {
    schema: parsePhotoMealPayload,
    handler: async (payload) => {
      const { image_base64, media_type, locale, hints } =
        payload as z.infer<typeof parsePhotoMealPayload>;
      const hintText =
        hints && hints.length > 0
          ? `\nKalibrerings-hints (nævn dem aldrig):\n${hints.map((h) => `- ${h}`).join("\n")}`
          : "";
      return askClaude({
        system: PARSE_PHOTO_MEAL_SYSTEM,
        user: `Sprog: ${locale}. Genkend maden på billedet.${hintText}`,
        imageBase64: image_base64,
        imageMediaType: media_type,
        schema: parsePhotoMealResult,
        maxTokens: 1024,
      });
    },
  },
  weekly_insight: {
    schema: weeklyInsightPayload,
    handler: async (payload) => {
      const { locale, stats } = payload as z.infer<typeof weeklyInsightPayload>;
      return askClaude({
        system: WEEKLY_INSIGHT_SYSTEM,
        user: `Sprog: ${locale}\nTalgrundlag: ${JSON.stringify(stats)}`,
        schema: weeklyInsightResult,
        maxTokens: 1024,
      });
    },
  },
  rank_alternatives: {
    schema: rankAlternativesPayload,
    handler: async (payload) => {
      const data = payload as z.infer<typeof rankAlternativesPayload>;
      return askClaude({
        system: RANK_ALTERNATIVES_SYSTEM,
        user: `Sprog: ${data.locale}\nVare: ${JSON.stringify(data.product)}\nUgens mangler: ${JSON.stringify(data.weeklyGaps)}\nKandidater: ${JSON.stringify(data.candidates)}`,
        schema: rankAlternativesResult,
        maxTokens: 1024,
      });
    },
  },
};

function error(req: Request, status: number, code: string): Response {
  return jsonResponse(req, status, { error: { code } });
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") return error(req, 405, "method_not_allowed");

  // ---- Auth: kun indloggede brugere ----
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return error(req, 401, "unauthorized");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);
  if (userError || !userData.user) return error(req, 401, "unauthorized");
  const userId = userData.user.id;

  // ---- Envelope ----
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error(req, 400, "invalid_json");
  }
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) return error(req, 400, "invalid_envelope");

  const task = tasks[envelope.data.task];
  if (!task) return error(req, 400, "unknown_task");

  // ---- Rate limit (service role; RLS-lukket tabel) ----
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count, error: countError } = await serviceClient
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneMinuteAgo);

  if (countError) {
    console.error(`ai task=${envelope.data.task} user=${userId} outcome=rate_check_failed`);
    return error(req, 500, "internal");
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    console.warn(`ai task=${envelope.data.task} user=${userId} outcome=rate_limited`);
    return error(req, 429, "rate_limited");
  }

  await serviceClient
    .from("ai_requests")
    .insert({ user_id: userId, task: envelope.data.task });
  // Opportunistisk oprydning af gamle rækker (fire-and-forget).
  void serviceClient
    .from("ai_requests")
    .delete()
    .lt("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .then(() => undefined);

  // ---- Task ----
  const payload = task.schema.safeParse(envelope.data.payload);
  if (!payload.success) return error(req, 400, "invalid_payload");

  try {
    const data = await task.handler(payload.data, userId);
    console.info(`ai task=${envelope.data.task} user=${userId} outcome=ok`);
    return jsonResponse(req, 200, { data });
  } catch (err) {
    // Aldrig payload-indhold i logs — kun fejlklassen.
    const code = err instanceof Error ? err.message : "internal";
    console.error(`ai task=${envelope.data.task} user=${userId} outcome=error code=${code}`);
    // Kendte, ufarlige koder sendes til klienten (rolig UX-besked);
    // alt andet skjules som "internal".
    const KNOWN_CODES: Record<string, number> = {
      missing_anthropic_key: 503,
      model_refusal: 502,
      invalid_model_json: 502,
    };
    if (code in KNOWN_CODES) return error(req, KNOWN_CODES[code], code);
    return error(req, 500, "internal");
  }
});
