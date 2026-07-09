import { useQuery } from "@tanstack/react-query";
import type { NutrientKey, Tables } from "@madro/core";
import { queryClient } from "../../lib/queryClient";
import { supabase } from "../../lib/supabase";
import type { FoodHit } from "../../scanner/useLookup";
import type { Meal } from "../scan/logMeal";

export type DiaryEntry = Pick<
  Tables<"log_entries">,
  "id" | "amount" | "unit" | "meal" | "consumed_at"
> & {
  foods: FoodHit | null;
};

const ENTRY_COLUMNS =
  "id,amount,unit,meal,consumed_at,foods(id,name,brand,source,data_quality,nova_group,nutriscore,nutriments,image_url,additives,categories)";

/** Lokal midnat for en dag — dagbogens dage følger brugerens tidszone. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** Stabil query-nøgle pr. lokal dag (YYYY-MM-DD). */
export function dayKey(date: Date): string {
  const d = startOfDay(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Korte søjle-labels til mikrostriben (deles af "I dag" og dagbogen). */
export const MICRO_LETTERS: Partial<Record<NutrientKey, string>> = {
  vitamin_d_ug: "D",
  iron_mg: "Fe",
  magnesium_mg: "Mg",
  calcium_mg: "Ca",
  potassium_mg: "K",
  vitamin_b12_ug: "B12",
  folate_ug: "Fo",
  zinc_mg: "Zn",
};

/** Hvad der skete med en post i EntrySheet — styrer forældrenes toast. */
export type EntryChangeKind = "saved" | "removed" | "enriched" | "swapped";

export const ENTRY_TOAST_KEY: Record<EntryChangeKind, string> = {
  saved: "diary.updated",
  removed: "diary.removed",
  enriched: "diary.enriched",
  swapped: "diary.swapped",
};

export const DIARY_KEY = "diary";
export const SUMMARY_KEY = "diary-summary";

/** Invalidér både postlisten og dags-summaryen (triggeren har allerede skrevet den). */
export function invalidateDiary(): void {
  void queryClient.invalidateQueries({ queryKey: [DIARY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [SUMMARY_KEY] });
}

/** Dagens poster med joined foods, kronologisk. */
export function useDiaryEntries(day: Date) {
  const key = dayKey(day);
  return useQuery<DiaryEntry[]>({
    queryKey: [DIARY_KEY, key],
    queryFn: async () => {
      const from = startOfDay(day);
      const to = addDays(from, 1);
      const { data, error } = await supabase
        .from("log_entries")
        .select(ENTRY_COLUMNS)
        .gte("consumed_at", from.toISOString())
        .lt("consumed_at", to.toISOString())
        .order("consumed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DiaryEntry[];
    },
  });
}

export type DailySummary = Tables<"daily_summaries">;

/**
 * Dagens præberegnede summary (skrives af Postgres-triggeren på
 * log_entries, fase 1.7). Null = ingen poster den dag.
 */
export function useDailySummary(day: Date) {
  const key = dayKey(day);
  return useQuery<DailySummary | null>({
    queryKey: [SUMMARY_KEY, key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summaries")
        .select("*")
        .eq("day", key)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function updateEntry(
  id: string,
  changes: {
    amountGrams: number;
    meal: Meal;
    foodId?: string;
    /** Ret visningsenheden (fx tablet→g når detektionen var forkert). */
    unit?: "g" | "tablet";
  },
): Promise<void> {
  const { error } = await supabase
    .from("log_entries")
    .update({
      amount: changes.amountGrams,
      meal: changes.meal,
      ...(changes.foodId ? { food_id: changes.foodId } : {}),
      ...(changes.unit ? { unit: changes.unit } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("log_entries").delete().eq("id", id);
  if (error) throw error;
}
