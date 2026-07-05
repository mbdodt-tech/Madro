import { useQuery } from "@tanstack/react-query";
import type { ReferenceRow } from "@madro/core";
import { supabase } from "./supabase";

/**
 * NNR-referencerækkerne for en region (read-only tabel, ændrer sig
 * aldrig i en session — lang staleTime).
 */
export function useReferences(region: string | undefined) {
  return useQuery<ReferenceRow[]>({
    queryKey: ["references", region ?? "DK"],
    enabled: !!region,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrient_references")
        .select("nutrient_key,region,sex,age_min,age_max,rda,ul,unit")
        .eq("region", region!);
      if (error) throw error;
      return (data ?? []) as ReferenceRow[];
    },
  });
}
