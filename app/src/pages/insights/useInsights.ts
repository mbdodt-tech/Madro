import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@madro/core";
import { queryClient } from "../../lib/queryClient";
import { supabase } from "../../lib/supabase";
import { addDays, dayKey } from "../diary/useDiary";

/** Mandag i den uge, datoen ligger i (lokal tid). */
export function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // man=0 … søn=6
  d.setDate(d.getDate() - offset);
  return d;
}

export type DailySummaryRow = Tables<"daily_summaries">;
export type InsightRow = Tables<"insights">;

/** Ugens 7 daily_summaries-rækker (kan være færre — huller er ok). */
export function useWeekSummaries(weekStart: Date) {
  const startKey = dayKey(weekStart);
  const endKey = dayKey(addDays(weekStart, 6));
  return useQuery<DailySummaryRow[]>({
    queryKey: ["summaries-week", startKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summaries")
        .select("*")
        .gte("day", startKey)
        .lte("day", endKey)
        .order("day");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Ugens persisterede AI-indsigt (null = ikke genereret endnu). */
export function useWeeklyInsight(weekStart: Date) {
  const startKey = dayKey(weekStart);
  return useQuery<InsightRow | null>({
    queryKey: ["insight", startKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("kind", "weekly")
        .eq("period_start", startKey)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export interface InsightContent {
  narrative: string;
  suggestions: { food: string; reason: string }[];
  stats: Record<string, unknown>;
}

/** Persistér ugens indsigt (RLS: egen bruger) og opdatér cachen. */
export async function saveWeeklyInsight(
  weekStart: Date,
  content: InsightContent,
): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("not_authenticated");
  const startKey = dayKey(weekStart);
  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: userId,
      kind: "weekly",
      period_start: startKey,
      period_end: dayKey(addDays(weekStart, 6)),
      // Struktureret indhold → jsonb (typen er bevidst snævrere end Json).
      content: JSON.parse(JSON.stringify(content)),
    })
    .select()
    .single();
  if (error) throw error;
  queryClient.setQueryData(["insight", startKey], data);
}
