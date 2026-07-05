import { useMutation, useQuery } from "@tanstack/react-query";
import type { Tables } from "@madro/core";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabase";
import { useSession } from "./useSession";

export type Profile = Tables<"profiles">;

const PROFILE_KEY = ["profile"] as const;

/**
 * Henter brugerens profil og opretter rækken ved første login
 * (RLS-politikken profiles_insert_own tillader netop dét).
 * Profilens locale vinder over lokal sprogindstilling.
 */
export function useProfile() {
  const { data: session } = useSession();
  const { i18n } = useTranslation();
  const userId = session?.user.id;

  const query = useQuery<Profile | null>({
    queryKey: PROFILE_KEY,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createProfile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .insert({ id: userId!, locale: i18n.language, hide_calories: false })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });

  // Første login: ingen række endnu → opret den.
  useEffect(() => {
    if (userId && query.isSuccess && query.data === null && createProfile.isIdle) {
      createProfile.mutate();
    }
  }, [userId, query.isSuccess, query.data, createProfile]);

  // Profilens sprog vinder ÉN gang ved login — ikke ved hvert
  // efterfølgende skift (ellers ruller effekten brugerens valg tilbage,
  // før serveropdateringen når frem).
  const appliedLocaleFor = useRef<string | null>(null);
  useEffect(() => {
    const locale = query.data?.locale;
    if (!userId || !locale || appliedLocaleFor.current === userId) return;
    appliedLocaleFor.current = userId;
    if (locale !== i18n.language) {
      void i18n.changeLanguage(locale);
      localStorage.setItem("madro-lang", locale);
    }
  }, [userId, query.data?.locale, i18n]);

  return query;
}

/** Opdaterer profilens locale (fire-and-forget fra sprogskifteren). */
export async function persistLocale(locale: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  // Optimistisk cache-opdatering, så intet andet ruller sproget tilbage.
  queryClient.setQueryData<Profile | null>(PROFILE_KEY, (old) =>
    old ? { ...old, locale } : old,
  );
  await supabase.from("profiles").update({ locale }).eq("id", userId);
}
