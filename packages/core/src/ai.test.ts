import { describe, expect, it, vi } from "vitest";
import { AiError, createAiClient } from "./ai";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

const baseOptions = {
  url: "https://example.supabase.co",
  anonKey: "anon-key",
  getAccessToken: async () => "jwt-token",
};

describe("callAi", () => {
  it("returns validated data for ping", async () => {
    const fetchFn = mockFetch(200, {
      data: { pong: true, time: "2026-07-05T08:00:00Z" },
    });
    const client = createAiClient({ ...baseOptions, fetchFn });

    const result = await client.callAi("ping", {});
    expect(result.pong).toBe(true);
    expect(result.time).toBe("2026-07-05T08:00:00Z");

    const call = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, RequestInit];
    expect(call[0]).toBe("https://example.supabase.co/functions/v1/ai");
    expect(JSON.parse(call[1].body as string)).toEqual({
      task: "ping",
      payload: {},
    });
  });

  it("throws not_authenticated without a session", async () => {
    const client = createAiClient({
      ...baseOptions,
      getAccessToken: async () => null,
      fetchFn: mockFetch(200, {}),
    });
    await expect(client.callAi("ping", {})).rejects.toMatchObject({
      code: "not_authenticated",
      status: 401,
    });
  });

  it("maps gateway error codes", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(429, { error: { code: "rate_limited" } }),
    });
    await expect(client.callAi("ping", {})).rejects.toMatchObject({
      code: "rate_limited",
      status: 429,
    });
  });

  it("validates parse_meal items (fase 2.1)", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: {
          items: [
            { name: "rugbrød", grams: 100, note: "2 skiver" },
            { name: "banan", grams: 120 },
          ],
        },
      }),
    });
    const result = await client.callAi("parse_meal", {
      text: "to skiver rugbrød og en banan",
      locale: "da",
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: "rugbrød", grams: 100 });
  });

  it("rejects parse_meal with invalid grams", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: { items: [{ name: "olie", grams: -5 }] },
      }),
    });
    await expect(
      client.callAi("parse_meal", { text: "x", locale: "da" }),
    ).rejects.toMatchObject({ code: "invalid_result" });
  });

  it("validates parse_label output (fase 2.3)", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: {
          name: "Proteinbar kakao",
          additives: ["e330", "e422"],
          nova_group: 4,
          nutriments: { energy_kcal: 380, protein_g: 30, salt_g: 0.4 },
        },
      }),
    });
    const result = await client.callAi("parse_label", {
      image_base64: "x",
      media_type: "image/jpeg",
      locale: "da",
    });
    expect(result.additives).toEqual(["e330", "e422"]);
    expect(result.nova_group).toBe(4);
    expect(result.nutriments.energy_kcal).toBe(380);
  });

  it("parse_label: kosttilskud med pr.-tablet-værdier (2026-07-09)", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: {
          name: "D3-vitamin",
          additives: [],
          nutriments: {},
          supplement: true,
          per_tablet: { vitamin_d_ug: 38, ukendt_noegle: 5 },
        },
      }),
    });
    const result = await client.callAi("parse_label", {
      image_base64: "x",
      media_type: "image/jpeg",
      locale: "da",
    });
    expect(result.supplement).toBe(true);
    expect(result.per_tablet.vitamin_d_ug).toBe(38);
    // Løs record: ukendte nøgler passerer skemaet — klienten filtrerer.
    expect(result.per_tablet.ukendt_noegle).toBe(5);
  });

  it("parse_label: supplement/per_tablet har trygge defaults", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: { additives: [], nutriments: {} },
      }),
    });
    const result = await client.callAi("parse_label", {
      image_base64: "x",
      media_type: "image/jpeg",
      locale: "da",
    });
    expect(result.supplement).toBe(false);
    expect(result.per_tablet).toEqual({});
  });

  it("rejects parse_label with malformed additive codes", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: { additives: ["citronsyre"], nutriments: {} },
      }),
    });
    await expect(
      client.callAi("parse_label", { image_base64: "x", media_type: "image/jpeg", locale: "da" }),
    ).rejects.toMatchObject({ code: "invalid_result" });
  });

  it("parse_photo_meal accepts zero items (no food recognized)", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, { data: { items: [] } }),
    });
    const result = await client.callAi("parse_photo_meal", {
      image_base64: "x",
      media_type: "image/jpeg",
      locale: "da",
    });
    expect(result.items).toEqual([]);
  });

  it("validates rank_alternatives picks (fase 2.5)", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, {
        data: {
          picks: [
            { id: "5f8008ba-c289-47b2-8340-da074c335495", reason: "Bedre Nutri-Score og mere fiber" },
          ],
        },
      }),
    });
    const result = await client.callAi("rank_alternatives", {});
    expect(result.picks).toHaveLength(1);
  });

  it("rejects rank_alternatives with non-uuid ids", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, { data: { picks: [{ id: "abc", reason: "x" }] } }),
    });
    await expect(client.callAi("rank_alternatives", {})).rejects.toMatchObject({
      code: "invalid_result",
    });
  });

  it("rejects malformed success envelopes", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, { data: { pong: "yes" } }),
    });
    await expect(client.callAi("ping", {})).rejects.toBeInstanceOf(AiError);
  });
});
