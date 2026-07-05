import { supabase } from "../../lib/supabase";

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

/** Forudvalgt måltid efter klokkeslæt. */
export function defaultMeal(hour: number): Meal {
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  return "snack";
}

export interface LogMealInput {
  foodId: string;
  amountGrams: number;
  meal: Meal;
  scanId: string | null;
  /** Sæt ved logning på en anden dag end i dag (dagbogens dato-navigation). */
  consumedAt?: Date;
}

/** Opret dagbogspost og markér scanningen som logget. */
export async function logMeal(input: LogMealInput): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("not_authenticated");

  const { error } = await supabase.from("log_entries").insert({
    user_id: userId,
    food_id: input.foodId,
    amount: input.amountGrams,
    unit: "g",
    meal: input.meal,
    scan_id: input.scanId,
    ...(input.consumedAt ? { consumed_at: input.consumedAt.toISOString() } : {}),
  });
  if (error) throw error;

  if (input.scanId) {
    await supabase
      .from("scans")
      .update({ outcome: "logged" })
      .eq("id", input.scanId);
  }
}
