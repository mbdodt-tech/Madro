import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabase";

export const SESSION_KEY = ["auth", "session"] as const;

/** Holder Supabase-sessionen i query-cachen og synkroniseret med auth-events. */
export function useSession() {
  const query = useQuery<Session | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queryClient.setQueryData(SESSION_KEY, session);
        if (!session) {
          // Ryd brugerspecifik cache ved logout.
          queryClient.removeQueries({ queryKey: ["profile"] });
        }
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  return query;
}
