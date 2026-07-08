import { scalePer100 } from "@madro/core";
import { PortionsStepper, cn } from "@madro/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../auth/useProfile";
import { MEALS, type Meal } from "../pages/scan/logMeal";

export const STEP_GRAMS = 25;
export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;

/** Tabletter (kosttilskud): 1 tablet = 1 g, ±1 pr. tryk, loft ved 20. */
const MAX_TABLETS = 20;

/**
 * Fælles portionsvælger: gram-felt med fri indtastning + ±25 g-stepper
 * + måltids-chips + kcal-preview. Bruges af både scan-flowet og
 * dagbogens redigering/tilføjelse. Respekterer hide_calories.
 * `tablets`: kosttilskudstilstand — værdien vises og steppes i tabletter
 * (1 tablet = 1 g-konventionen gør gram og antal identiske).
 */
export function PortionForm({
  grams,
  meal,
  onGrams,
  onMeal,
  energyKcalPer100,
  tablets = false,
}: {
  grams: number;
  meal: Meal;
  onGrams: (grams: number) => void;
  onMeal: (meal: Meal) => void;
  energyKcalPer100?: number | null;
  tablets?: boolean;
}) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const step = tablets ? 1 : STEP_GRAMS;
  const max = tablets ? MAX_TABLETS : MAX_GRAMS;
  const clampGrams = (value: number): number =>
    Math.min(max, Math.max(MIN_GRAMS, Math.round(value)));

  // Tekst-spejl af gram-værdien, så feltet kan stå tomt/halvskrevet
  // under indtastning uden at rykke i den rigtige værdi.
  const [text, setText] = useState(String(grams));
  useEffect(() => {
    setText(String(grams));
  }, [grams]);

  const commitText = (value: string) => {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      onGrams(clampGrams(parsed));
    } else {
      setText(String(grams));
    }
  };

  const kcal =
    energyKcalPer100 != null ? Math.round(scalePer100(energyKcalPer100, grams)) : null;

  return (
    <div className="space-y-4">
      <PortionsStepper
        valueLabel={
          <span className="flex items-baseline gap-1">
            <input
              inputMode="numeric"
              aria-label={t(tablets ? "portion.tabletsLabel" : "portion.gramsLabel")}
              value={text}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d,.]/g, "");
                setText(raw);
                const parsed = Number(raw.replace(",", "."));
                if (Number.isFinite(parsed) && parsed > 0) {
                  onGrams(clampGrams(parsed));
                }
              }}
              onBlur={(e) => commitText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className={cn(
                "w-16 rounded-md bg-transparent text-center font-mono text-h2 font-semibold tabular-nums text-ink",
                "focus-visible:outline-2 focus-visible:outline-brand",
              )}
            />
            <span className="font-mono text-h2 font-semibold text-ink">
              {tablets ? t("portion.tabletWord", { count: grams }) : "g"}
            </span>
          </span>
        }
        subLabel={
          !tablets && !hideCalories && kcal != null ? `${kcal} kcal` : undefined
        }
        onDecrease={() => onGrams(clampGrams(grams - step))}
        onIncrease={() => onGrams(clampGrams(grams + step))}
        decreaseLabel={t("portion.less")}
        increaseLabel={t("portion.more")}
        decreaseDisabled={grams <= MIN_GRAMS}
        increaseDisabled={grams >= max}
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label={t("portion.mealLabel")}>
        {MEALS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMeal(m)}
            className={cn(
              "rounded-pill px-4 py-2 text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              meal === m
                ? "bg-brand text-on-brand"
                : "border border-hairline bg-surface text-secondary hover:bg-brand-tint hover:text-brand",
            )}
          >
            {t(`portion.meal.${m}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
