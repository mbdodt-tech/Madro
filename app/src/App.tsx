import { formatGrams } from "@madro/core";
import { HelloCard } from "@madro/ui";
import { DesignPage } from "./pages/DesignPage";

/**
 * Fase 0.2: simpel pathname-visning — en rigtig router kommer med
 * app-skallen i senere trin. /design er designsystemets specimen-side.
 */
export function App() {
  if (window.location.pathname === "/design") {
    return <DesignPage />;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16 font-sans">
      <HelloCard>
        <h1 className="text-display text-ink">Madro</h1>
        <p className="mt-2 font-mono text-small text-secondary" data-testid="core-proof">
          {formatGrams(6.2)}
        </p>
        <a
          className="mt-6 inline-block rounded-md bg-brand-tint px-4 py-2 text-small font-medium text-brand"
          href="/design"
        >
          Designsystem →
        </a>
      </HelloCard>
    </main>
  );
}
