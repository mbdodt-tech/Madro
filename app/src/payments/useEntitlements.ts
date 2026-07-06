import { useProfile } from "../auth/useProfile";
import { activeProvider } from "./provider";

/**
 * Feature-gating-kontrakten (CLAUDE.md): ingen komponent tjekker
 * plan-navne, Stripe eller StoreKit direkte — kun disse capabilities.
 * Kilden er entitlements-adapteren (fase 4.3): stub nu, RevenueCat
 * bag PRÆCIS samme interface når nøglerne findes.
 */
export interface Entitlements {
  /** false indtil kilden er indlæst — gate-beslutninger bør vente. */
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
  const snapshot = activeProvider(profile);
  return {
    ready: snapshot.ready,
    premium: snapshot.premium,
    weeklyInsights: snapshot.premium,
    alternatives: snapshot.premium,
  };
}
