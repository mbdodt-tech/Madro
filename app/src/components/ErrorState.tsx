import { Button } from "@madro/ui";
import { useTranslation } from "react-i18next";

/**
 * Neutralt fejlkort (offline/serverfejl): rolig besked + "Prøv igen".
 * Bruges hvor en fejlet query ellers ville ligne en tom tilstand.
 */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="rounded-lg border border-card-edge bg-surface px-5 py-8 text-center shadow-1"
    >
      <p className="text-body text-secondary">{t("common.errorTitle")}</p>
      <p className="mt-1 text-small text-tertiary">{t("common.errorBody")}</p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
