import {
  buildCorrectionHints,
  type CorrectionItem,
  type CorrectionPair,
} from "@madro/core";
import { supabase } from "../../lib/supabase";

/**
 * Foto-forfining (fase 3.4): rettelses-par gemmes i scans.payload
 * (kun navne/gram — aldrig billeder), og de seneste ≤20 aggregeres
 * til kalibrerings-hints for parse_photo_meal via core-funktionen.
 */

export async function fetchCorrectionHints(
  locale: "da" | "en",
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select("payload")
      .eq("type", "photo")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    const pairs = (data ?? [])
      .map(
        (row) =>
          row.payload as {
            ai_items?: CorrectionItem[];
            final_items?: CorrectionItem[];
          } | null,
      )
      .filter(
        (p): p is CorrectionPair =>
          Array.isArray(p?.ai_items) && Array.isArray(p?.final_items),
      );
    return buildCorrectionHints(pairs, locale);
  } catch {
    // Hints er ren bonus — fejl her må aldrig blokere fotoflowet.
    return [];
  }
}

/** Gem AI-forslag vs. brugerens endelige rækker på foto-scannen. */
export async function saveCorrectionPair(
  scanId: string,
  aiItems: CorrectionItem[],
  finalItems: CorrectionItem[],
): Promise<void> {
  await supabase
    .from("scans")
    .update({
      payload: JSON.parse(
        JSON.stringify({ ai_items: aiItems, final_items: finalItems }),
      ),
    })
    .eq("id", scanId);
}
