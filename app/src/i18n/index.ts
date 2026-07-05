import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import da from "./locales/da.json";
import en from "./locales/en.json";

const stored = localStorage.getItem("madro-lang");
const browser = navigator.language.toLowerCase().startsWith("da") ? "da" : "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    da: { translation: da },
  },
  lng: stored ?? browser,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
