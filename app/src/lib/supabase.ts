import type { Database } from "@madro/core";
import { createClient } from "@supabase/supabase-js";

// Klienten bruger KUN publishable/anon key + RLS (CLAUDE.md-regel).
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
