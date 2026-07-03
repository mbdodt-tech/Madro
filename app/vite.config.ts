import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Monorepo-roden — dev-serveren skal kunne servere fonte fra rodens
// node_modules (Vites workspace-detektion fejler på Windows-drevbogstav).
const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
