import { cn } from "@madro/ui";
import { useTranslation } from "react-i18next";
import { persistLocale } from "../auth/useProfile";

const languages = [
  { code: "da", label: "Dansk" },
  { code: "en", label: "English" },
] as const;

export function LanguageSwitch() {
  const { i18n, t } = useTranslation();

  const setLanguage = (code: string) => {
    void i18n.changeLanguage(code);
    localStorage.setItem("madro-lang", code);
    void persistLocale(code); // no-op når man ikke er logget ind
  };

  return (
    <div
      className="flex gap-0.5 rounded-pill border border-hairline bg-surface p-0.5"
      role="group"
      aria-label={t("common.language")}
    >
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={cn(
            "rounded-pill px-3 py-1 text-small font-medium transition-colors",
            i18n.language === lang.code
              ? "bg-brand text-on-brand"
              : "text-secondary hover:bg-brand-tint hover:text-brand",
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
