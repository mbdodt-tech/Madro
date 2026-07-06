import type { Profile } from "../auth/useProfile";

/**
 * Entitlements-adapteren (fase 4.3): useEntitlements kender KUN dette
 * interface — udbyderen (stub nu, RevenueCat senere) er et implementerings-
 * valg her i filen. Ingen komponent må importere udbyderne direkte.
 */
export interface EntitlementsSnapshot {
  /** false indtil kilden er indlæst — gate-beslutninger bør vente. */
  ready: boolean;
  premium: boolean;
}

export type EntitlementsProvider = (
  profile: Profile | null | undefined,
) => EntitlementsSnapshot;

/** Stub: læser profiles.entitlement ('premium' sættes manuelt i beta). */
export const stubProvider: EntitlementsProvider = (profile) => ({
  ready: profile != null,
  premium: profile?.entitlement === "premium",
});

/**
 * RevenueCat-skelettet — aktiveres når kontiene findes (se docs/env.md):
 * 1) `pnpm add @revenuecat/purchases-js` i app/.
 * 2) Purchases.configure({ apiKey: VITE_REVENUECAT_KEY, appUserId: auth.uid })
 *    ved login; lyt på customerInfo og spejl `entitlements.active["premium"]`
 *    til profiles.entitlement (server-webhook eller klient-spejl).
 * 3) Skift activeProvider til revenuecatProvider — resten af appen er urørt.
 * Indtil da opfører skelettet sig som stubben, så intet kan gå halvt i stykker.
 */
export const revenuecatProvider: EntitlementsProvider = (profile) =>
  stubProvider(profile);

export const activeProvider: EntitlementsProvider = stubProvider;
