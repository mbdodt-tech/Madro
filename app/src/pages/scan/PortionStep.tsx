import type { NutrientMap } from "@madro/core";
import { Button, PortionsStepper, cn } from "@madro/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../auth/useProfile";
import type { FoodHit } from "../../scanner/useLookup";
import { MEALS, defaultMeal, logMeal, type Meal } from "./logMeal";

const STEP_GRAMS = 25;
const MIN_GRAMS = 25;
const MAX_GRAMS = 1000;

export function PortionStep({
  food,
  scanId,
  onBack,
  onLogged,
}: {
  food: FoodHit;
  scanId: string | null;
  onBack: () => void;
  onLogged: () => void;
}) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal(new Date().getHours()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const nutriments = (food.nutriments ?? {}) as NutrientMap;
  const kcal =
    nutriments.energy_kcal != null
      ? Math.round((nutriments.energy_kcal * grams) / 100)
      : null;

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      await logMeal({ foodId: food.id, amountGrams: grams, meal, scanId });
      onLogged();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("portion.back")}
          className="grid size-10 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h3 className="truncate text-h2 text-ink">{food.name}</h3>
          <p className="text-small text-secondary">{t("portion.howMuch")}</p>
        </div>
      </div>

      <PortionsStepper
        valueLabel={`${grams} g`}
        subLabel={!hideCalories && kcal != null ? `${kcal} kcal` : undefined}
        onDecrease={() => setGrams((g) => Math.max(MIN_GRAMS, g - STEP_GRAMS))}
        onIncrease={() => setGrams((g) => Math.min(MAX_GRAMS, g + STEP_GRAMS))}
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
            onClick={() => setMeal(m)}
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

      {error ? (
        <p className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad" role="alert">
          {t("portion.error")}
        </p>
      ) : null}

      <Button className="w-full" onClick={() => void submit()} disabled={busy}>
        {t("portion.log")}
      </Button>
    </div>
  );
}
