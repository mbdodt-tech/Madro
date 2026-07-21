import { Button } from "@madro/ui";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

/**
 * Gate-teaser for premium-funktioner (2026-07-09): hvidt kort med
 * tint-ikonchip (designidentitet) — fortæller HVAD funktionen gør og
 * linker til paywallen. Aldrig skam, kun invitation.
 */
export function PremiumTeaser({ body }: { body: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-card-edge bg-surface p-4 shadow-1">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-tint text-brand">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <p className="text-body font-medium text-ink">{t("premium.gateTitle")}</p>
          <p className="text-small text-secondary">{body}</p>
          <Button variant="secondary" size="sm" onClick={() => navigate("/premium")}>
            {t("insights.seePremium")}
          </Button>
        </div>
      </div>
    </div>
  );
}
