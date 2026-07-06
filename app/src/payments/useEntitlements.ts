import { useProfile } from "../auth/useProfile";

/**
 * Feature-gating-kontrakten (CLAUDE.md): ingen komponent tjekker
 * plan-navne, Stripe eller StoreKit direkte — kun disse capabilities.
 * Fase 4 kobler RevenueCat på bag PRÆCIS samme interface; indtil da
 * læses profiles.entitlement ('free' er default).
 */
export interface Entitlements {
  /** false indtil profilen er indlæst — gate-beslutninger bør vente. */
  ready: boolean;
  /** Ugentlige AI-indsigter (fase 2.4). */
  weeklyInsights: boolean;
  /** Bedre alternativ-forslag (fase 2.5). */
  alternatives: boolean;
  /** Dyb mikronæring, fotologning m.m. gates her fra Fase 4. */
  premium: boolean;
}

export function useEntitlements(): Entitlements {
  const { data: profile } = useProfile();
  const premium = profile?.entitlement === "premium";
  return {
    ready: profile != null,
    premium,
    weeklyInsights: premium,
    alternatives: premium,
  };
}
