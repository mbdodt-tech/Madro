import { computeVerdict, type NutrientMap } from "@madro/core";
import { Button, Chip, Sheet, VerdiktBadge } from "@madro/ui";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useProfile } from "../../auth/useProfile";
import { useEntitlements } from "../../payments/useEntitlements";
import type { FoodHit } from "../../scanner/useLookup";
import { AlternativesStep } from "./AlternativesStep";
import { formatAdditive } from "./format";
import { PortionStep } from "./PortionStep";

function MacroLine({ nutriments }: { nutriments: NutrientMap }) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const parts: string[] = [];
  if (!hideCalories && nutriments.energy_kcal != null) {
    parts.push(`${Math.round(nutriments.energy_kcal)} kcal`);
  }
  const macro = (key: "protein_g" | "carbohydrate_g" | "fat_g", label: string) => {
    const v = nutriments[key];
    if (v != null) parts.push(`${label} ${v.toLocaleString("da-DK", { maximumFractionDigits: 1 })} g`);
  };
  macro("protein_g", t("verdict.protein"));
  macro("carbohydrate_g", t("verdict.carbs"));
  macro("fat_g", t("verdict.fat"));

  if (parts.length === 0) return null;
  return (
    <div className="rounded-md border border-hairline bg-bg px-4 py-3">
      <p className="text-caption font-medium text-tertiary">{t("verdict.per100g")}</p>
      <p className="font-mono text-small text-ink">{parts.join(" · ")}</p>
    </div>
  );
}

export function ResultSheet({
  food,
  scanId,
  open,
  onClose,
  onLogged,
  onSwapFood,
}: {
  food: FoodHit;
  scanId: string | null;
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
  /** Åbn et alternativs eget verdikt-ark (fase 2.5). */
  onSwapFood?: (food: FoodHit) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { alternatives: hasAlternatives, ready: entitlementsReady } = useEntitlements();
  const [step, setStep] = useState<"verdict" | "portion" | "alternatives">("verdict");
  const [showPremiumHint, setShowPremiumHint] = useState(false);

  const hasCategories = ((food.categories as string[] | null) ?? []).length > 0;

  const verdict = useMemo(
    () =>
      computeVerdict({
        nutriscore: food.nutriscore,
        novaGroup: food.nova_group,
        additivesCount: Array.isArray(food.additives) ? food.additives.length : null,
      }),
    [food],
  );

  const additives = (food.additives ?? []) as string[];
  const nutriments = (food.nutriments ?? {}) as NutrientMap;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={t("verdict.sheetTitle")}
    >
      {step === "verdict" ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => navigate(`/product/${food.id}`)}
            className="flex w-full items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            aria-label={t("verdict.openDetails")}
          >
            {food.image_url ? (
              <motion.img
                layoutId={`food-image-${food.id}`}
                src={food.image_url}
                alt=""
                className="size-14 flex-none rounded-md border border-hairline object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1">
              <motion.span
                layoutId={`food-name-${food.id}`}
                className="block truncate text-h2 text-ink"
              >
                {food.name}
              </motion.span>
              {food.brand ? (
                <span className="block truncate text-small text-secondary">
                  {food.brand}
                </span>
              ) : null}
            </span>
            <svg viewBox="0 0 24 24" className="size-5 flex-none text-tertiary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>

          {verdict.insufficient ? (
            <Chip>{t("verdict.insufficient")}</Chip>
          ) : (
            <VerdiktBadge
              level={verdict.level}
              label={t(`verdict.level.${verdict.level}`)}
              score={`${verdict.score}/100`}
            />
          )}

          <div className="flex flex-wrap gap-2">
            {food.nova_group != null ? (
              <Chip>
                {t("verdict.novaChip", { group: food.nova_group })}
                {food.nova_group === 4 ? ` · ${t("verdict.ultraProcessed")}` : ""}
              </Chip>
            ) : null}
            {food.nutriscore ? (
              <Chip>Nutri-Score {food.nutriscore.toUpperCase()}</Chip>
            ) : null}
            <Chip>{t("verdict.additivesChip", { count: additives.length })}</Chip>
          </div>

          {additives.length > 0 ? (
            <p className="text-small text-secondary">
              {additives.slice(0, 8).map(formatAdditive).join(" · ")}
              {additives.length > 8 ? " …" : ""}
            </p>
          ) : null}

          <MacroLine nutriments={nutriments} />

          <p className="text-caption text-tertiary">
            {t(`scan.source.${food.source}`)} · {t(`verdict.quality.${food.data_quality}`)}
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button className="w-full" onClick={() => setStep("portion")}>
              {t("verdict.ateIt")}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!hasCategories}
              onClick={() => {
                // Vent på entitlements — ellers ser premium-brugere
                // fejlagtigt teaseren i et kort vindue efter load.
                if (!entitlementsReady) return;
                if (hasAlternatives) setStep("alternatives");
                else setShowPremiumHint(true);
              }}
            >
              {t("verdict.showAlternative")}
            </Button>
            {showPremiumHint ? (
              <div className="flex items-start gap-3 rounded-lg border border-hairline bg-surface px-4 py-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-small font-medium text-ink">
                    {t("verdict.alternatives.premiumTitle")}
                  </p>
                  <p className="text-caption text-secondary">
                    {t("verdict.alternatives.premiumBody")}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : step === "portion" ? (
        <PortionStep
          food={food}
          scanId={scanId}
          onBack={() => setStep("verdict")}
          onLogged={onLogged}
        />
      ) : (
        <AlternativesStep
          food={food}
          scanId={scanId}
          onBack={() => setStep("verdict")}
          onPick={(alternative) => {
            setStep("verdict");
            onSwapFood?.(alternative);
          }}
        />
      )}
    </Sheet>
  );
}
