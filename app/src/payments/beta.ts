import { queryClient } from "../lib/queryClient";
import { supabase } from "../lib/supabase";

/**
 * Beta-prøven (2026-07-09): paywall-CTA'en aktiverer premium ved at
 * sætte entitlement på brugerens EGEN profilrække (stub-adapterens
 * kilde, RLS-afgrænset). Når RevenueCat kobles på (docs/env.md), bliver
 * samme knap til det rigtige køb, og webhooken ejer feltet — resten af
 * appen er urørt, fordi al gating går gennem useEntitlements.
 */
export async function setBetaEntitlement(premium: boolean): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("not_authenticated");
  const { error } = await supabase
    .from("profiles")
    .update({ entitlement: premium ? "premium" : "free" })
    .eq("id", userId);
  if (error) throw error;
  await queryClient.invalidateQueries({ queryKey: ["profile"] });
}
