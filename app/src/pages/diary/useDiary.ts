import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@madro/core";
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
  "id,amount,unit,meal,consumed_at,foods(id,name,brand,source,data_quality,nova_group,nutriscore,nutriments,image_url,additives)";

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

export const DIARY_KEY = "diary";

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

export async function updateEntry(
  id: string,
  changes: { amountGrams: number; meal: Meal },
): Promise<void> {
  const { error } = await supabase
    .from("log_entries")
    .update({ amount: changes.amountGrams, meal: changes.meal })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from("log_entries").delete().eq("id", id);
  if (error) throw error;
}
