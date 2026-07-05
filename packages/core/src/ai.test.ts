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

  it("rejects malformed success envelopes", async () => {
    const client = createAiClient({
      ...baseOptions,
      fetchFn: mockFetch(200, { data: { pong: "yes" } }),
    });
    await expect(client.callAi("ping", {})).rejects.toBeInstanceOf(AiError);
  });
});
