import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import da from "./locales/da.json";
import en from "./locales/en.json";

// Sprogvalg-rækkefølge: eksplicit valg (localStorage) → dansk som default.
// Dansk er beta-sproget (CLAUDE.md), så vi defaulter IKKE til browsersproget —
// en dansk beta-bruger på en engelsksproget browser/automation skal møde dansk,
// ikke engelsk (regressionsfund NYT-1, 2026-07-21). En logget-ind brugers
// profil-locale vinder efterfølgende (se useProfile) og overlever deploys.
const stored = localStorage.getItem("madro-lang");

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    da: { translation: da },
  },
  lng: stored ?? "da",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
