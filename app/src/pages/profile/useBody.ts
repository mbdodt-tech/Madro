import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../lib/queryClient";
import { supabase } from "../../lib/supabase";
import { persistProfileFields } from "../../auth/useProfile";
import { dayKey } from "../diary/useDiary";

/**
 * Aktivitets-/kropsdatalaget (fase 3.2). 'source' = 'manual' herfra;
 * HealthKit m.fl. (Fase 5) skriver i de samme tabeller.
 */

const BODY_KEY = ["body-metrics"] as const;
const activityKey = (day: string) => ["activity", day] as const;

export interface WeightPoint {
  day: string;
  weight_kg: number;
}

/** Seneste 8 vægtmålinger, ældste først (klar til kurven). */
export function useWeightHistory() {
  return useQuery<WeightPoint[]>({
    queryKey: BODY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_metrics")
        .select("day, weight_kg")
        .order("day", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? [])
        .map((r) => ({ day: r.day, weight_kg: Number(r.weight_kg) }))
        .reverse();
    },
  });
}

/**
 * Logger dagens vægt: upsert i body_metrics (PK user_id+day) og spejling
 * til profiles.weight_kg, så energireferencen følger med.
 */
export async function logWeightToday(weightKg: number): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  const { error } = await supabase.from("body_metrics").upsert(
    { user_id: userId, day: dayKey(new Date()), weight_kg: weightKg },
    { onConflict: "user_id,day" },
  );
  if (error) throw error;
  await persistProfileFields({ weight_kg: weightKg });
  void queryClient.invalidateQueries({ queryKey: BODY_KEY });
}

export interface ActivityDay {
  steps: number | null;
  active_kcal: number | null;
}

/** Dagens aktivitetsrække (null når intet er logget). */
export function useTodayActivity() {
  const day = dayKey(new Date());
  return useQuery<ActivityDay | null>({
    queryKey: activityKey(day),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_days")
        .select("steps, active_kcal")
        .eq("day", day)
        .maybeSingle();
      if (error) throw error;
      return data
        ? {
            steps: data.steps,
            active_kcal: data.active_kcal != null ? Number(data.active_kcal) : null,
          }
        : null;
    },
  });
}

/** Gemmer dagens aktivitet (delvise felter tilladt) — upsert pr. dag. */
export async function saveActivityToday(
  fields: Partial<ActivityDay>,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  const day = dayKey(new Date());
  const existing = queryClient.getQueryData<ActivityDay | null>(activityKey(day));
  const next = { ...(existing ?? { steps: null, active_kcal: null }), ...fields };
  const { error } = await supabase.from("activity_days").upsert(
    { user_id: userId, day, steps: next.steps, active_kcal: next.active_kcal },
    { onConflict: "user_id,day" },
  );
  if (error) throw error;
  queryClient.setQueryData(activityKey(day), next);
}
