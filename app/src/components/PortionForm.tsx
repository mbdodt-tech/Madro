import { scalePer100 } from "@madro/core";
import { PortionsStepper, cn } from "@madro/ui";
import { useTranslation } from "react-i18next";
import { useProfile } from "../auth/useProfile";
import { MEALS, type Meal } from "../pages/scan/logMeal";

export const STEP_GRAMS = 25;
export const MIN_GRAMS = 25;
export const MAX_GRAMS = 1000;

/**
 * Fælles portionsvælger: gram-stepper + måltids-chips + kcal-preview.
 * Bruges af både scan-flowet (PortionStep) og dagbogens redigering/
 * tilføjelse, så portionsvalg ser og opfører sig ens overalt.
 * Respekterer hide_calories.
 */
export function PortionForm({
  grams,
  meal,
  onGrams,
  onMeal,
  energyKcalPer100,
}: {
  grams: number;
  meal: Meal;
  onGrams: (grams: number) => void;
  onMeal: (meal: Meal) => void;
  energyKcalPer100?: number | null;
}) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const kcal =
    energyKcalPer100 != null ? Math.round(scalePer100(energyKcalPer100, grams)) : null;

  return (
    <div className="space-y-4">
      <PortionsStepper
        valueLabel={`${grams} g`}
        subLabel={!hideCalories && kcal != null ? `${kcal} kcal` : undefined}
        onDecrease={() => onGrams(Math.max(MIN_GRAMS, grams - STEP_GRAMS))}
        onIncrease={() => onGrams(Math.min(MAX_GRAMS, grams + STEP_GRAMS))}
        decreaseLabel={t("portion.less")}
        increaseLabel={t("portion.more")}
        decreaseDisabled={grams <= MIN_GRAMS}
        increaseDisabled={grams >= MAX_GRAMS}
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
