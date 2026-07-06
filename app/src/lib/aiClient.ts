import { createAiClient } from "@madro/core";
import { supabase } from "./supabase";

/** Appens ene AI-klient — al AI går gennem gateway-funktionen (CLAUDE.md). */
export const aiClient = createAiClient({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  getAccessToken: async () =>
    (await supabase.auth.getSession()).data.session?.access_token ?? null,
});
