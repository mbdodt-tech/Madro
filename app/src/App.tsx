import { formatGrams } from "@madro/core";
import { HelloCard } from "@madro/ui";

/**
 * Fase 0.1 hello page: proves that app/ consumes both workspace packages.
 * Replaced by the real AppShell from Fase 0.3 onwards.
 */
export function App() {
  return (
    <HelloCard>
      <h1>Madro</h1>
      <p data-testid="core-proof">{formatGrams(6.2)}</p>
    </HelloCard>
  );
}
