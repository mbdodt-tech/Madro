import type { ReactNode } from "react";

/**
 * Placeholder for @madro/ui — proves workspace linking in Fase 0.1.
 * Real tokens and components arrive in Fase 0.2/0.3; keep this unstyled.
 */
export function HelloCard({ children }: { children: ReactNode }) {
  return <section data-testid="hello-card">{children}</section>;
}
