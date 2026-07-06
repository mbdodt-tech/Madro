import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useProfile } from "./useProfile";

/**
 * Onboarding-gate (fase 4.1): uden profiles.onboarded_at sendes brugeren
 * til /onboarding — også brugere fra før 4.1 (ét catch-up-flow).
 * Bruges INDEN i RequireAuth; /onboarding selv nøjes med RequireAuth.
 */
export function RequireOnboarded({ children }: { children: ReactNode }) {
  const { data: profile, isLoading } = useProfile();

  // Profilen oprettes ved første login (useProfile-effekten) — vent roligt.
  if (isLoading || !profile) return null;
  if (!profile.onboarded_at) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
