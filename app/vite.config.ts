import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Monorepo-roden — dev-serveren skal kunne servere fonte fra rodens
// node_modules (Vites workspace-detektion fejler på Windows-drevbogstav).
const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      // Registreringen sker manuelt i main.tsx (springes over i
      // Capacitor-skallen — SW oven på capacitor:// giver kun kolbøtter).
      injectRegister: null,
      // App-shell-caching KUN (fase 0.7): ingen runtime-caching af
      // Supabase-API'et — kostdata må ikke ligge offline (GDPR).
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
        navigateFallback: "/index.html",
        runtimeCaching: [],
      },
      manifest: {
        name: "Madro",
        short_name: "Madro",
        description: "Forstå kvaliteten af det, du spiser",
        lang: "da",
        display: "standalone",
        start_url: "/",
        theme_color: "#0E7A5E",
        background_color: "#FBFBF9",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});
