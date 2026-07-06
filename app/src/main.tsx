import "./lib/sentry";
import { ThemeProvider, ToastProvider } from "@madro/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { isNative } from "./lib/platform";
import { queryClient } from "./lib/queryClient";
import "./i18n";
import "./index.css";

// PWA-service-workeren hører til web — Capacitor-skallen serverer lokalt
// og skal ikke have et cachelag imellem (fase 5.1).
if (!isNative()) {
  registerSW({ immediate: true });
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
