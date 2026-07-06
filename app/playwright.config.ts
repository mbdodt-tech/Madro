import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lokalt ligger e2e-brugerens login i gitignoret .env.e2e; i CI kommer
// E2E_EMAIL/E2E_PASSWORD som miljøvariabler (GitHub-secret).
try {
  const env = readFileSync(resolve(process.cwd(), ".env.e2e"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!.trim();
  }
} catch {
  // CI: variabler sat udefra.
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  // Én delt testbruger → sekventielt, ellers sloges testene om dagbogen.
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 430, height: 900 },
    locale: "da-DK",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // PWA'ens service worker omgår Playwrights offline-emulering
    // (setOffline rammer ikke SW-medierede kald) — blokér den i tests.
    serviceWorkers: "block",
  },
  webServer: {
    // Prod-bygning (bruger .env.production) — samme artefakt som Vercel.
    command: "pnpm build && pnpm preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
