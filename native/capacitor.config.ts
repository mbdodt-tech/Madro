import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor-skallen (fase 5.1). Web-bygget kommer fra app/ — skallen
 * indeholder ingen app-logik. Bundle-id'et er også App Store-identiteten;
 * det kan ikke ændres efter første indsendelse.
 */
const config: CapacitorConfig = {
  appId: "dk.madro.app",
  appName: "Madro",
  webDir: "../app/dist",
  plugins: {
    SplashScreen: {
      // Dyb evergreen — instrumentpanelets farve (tokens: --panel)
      backgroundColor: "#0c2b22",
      launchShowDuration: 800,
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      // Overlap undgås; appens safe-area-håndtering tager resten
      overlaysWebView: false,
      style: "DEFAULT",
    },
  },
};

export default config;
