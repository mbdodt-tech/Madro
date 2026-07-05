import type { NutrientMap } from "@madro/core";
import { Button } from "@madro/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PortionForm } from "../../components/PortionForm";
import type { FoodHit } from "../../scanner/useLookup";
import { defaultMeal, logMeal, type Meal } from "./logMeal";

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

  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal(new Date().getHours()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const nutriments = (food.nutriments ?? {}) as NutrientMap;

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

      <PortionForm
        grams={grams}
        meal={meal}
        onGrams={setGrams}
        onMeal={setMeal}
        energyKcalPer100={nutriments.energy_kcal ?? null}
      />

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
