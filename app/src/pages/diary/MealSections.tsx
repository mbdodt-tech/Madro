import {
  computeVerdict,
  scalePer100,
  type NutrientMap,
} from "@madro/core";
import { cn } from "@madro/ui";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../auth/useProfile";
import { MEALS, type Meal } from "../scan/logMeal";
import type { DiaryEntry } from "./useDiary";

const DOT_CLASS: Record<string, string> = {
  excellent: "bg-v-excellent",
  good: "bg-v-good",
  mid: "bg-v-mid",
  poor: "bg-v-poor",
  bad: "bg-v-bad",
  insufficient: "bg-hairline",
};

function verdictLevel(entry: DiaryEntry): string {
  const food = entry.foods;
  if (!food) return "insufficient";
  const result = computeVerdict({
    nutriscore: food.nutriscore,
    novaGroup: food.nova_group,
    additivesCount: food.additives ? food.additives.length : null,
  });
  return result.insufficient ? "insufficient" : result.level;
}

function entryKcal(entry: DiaryEntry): number | null {
  const per100 = (entry.foods?.nutriments as NutrientMap | null)?.energy_kcal;
  if (per100 == null) return null;
  return Math.round(scalePer100(per100, Number(entry.amount)));
}

/**
 * Måltidsgrupperne (morgenmad/frokost/aftensmad/snacks) med verdikt-prik,
 * gram og kcal pr. post + kcal-subtotal. Deles af Dagbogen og "I dag".
 * Respekterer hide_calories.
 */
export function MealSections({
  entries,
  onEntryClick,
}: {
  entries: DiaryEntry[];
  onEntryClick: (entry: DiaryEntry) => void;
}) {
  const { t } = useTranslation();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const byMeal = new Map<Meal, DiaryEntry[]>();
  for (const meal of MEALS) byMeal.set(meal, []);
  for (const entry of entries) {
    byMeal.get(entry.meal as Meal)?.push(entry);
  }

  return (
    <>
      {MEALS.map((meal) => {
        const mealEntries = byMeal.get(meal) ?? [];
        if (mealEntries.length === 0) return null;
        const subtotal = mealEntries.reduce<number | null>((sum, e) => {
          const kcal = entryKcal(e);
          if (kcal == null) return sum;
          return (sum ?? 0) + kcal;
        }, null);
        return (
          <section key={meal} aria-label={t(`portion.meal.${meal}`)}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-caption font-semibold uppercase tracking-widest text-tertiary">
                {t(`portion.meal.${meal}`)}
              </h2>
              {!hideCalories && subtotal != null ? (
                <span className="font-mono text-caption tabular-nums text-tertiary">
                  {subtotal} kcal
                </span>
              ) : null}
            </div>
            <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-card-edge shadow-1">
              {mealEntries.map((entry) => {
                const kcal = entryKcal(entry);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => onEntryClick(entry)}
                      className="flex w-full items-center gap-3 bg-surface px-4 py-3 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2.5 shrink-0 rounded-pill",
                          DOT_CLASS[verdictLevel(entry)],
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body text-ink">
                          {entry.foods?.name ?? t("diary.entry.unknownFood")}
                        </span>
                        {entry.foods?.brand ? (
                          <span className="block truncate text-caption text-tertiary">
                            {entry.foods.brand}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-mono text-small tabular-nums text-secondary">
                          {Math.round(Number(entry.amount))}{" "}
                          {entry.unit === "tablet"
                            ? t("portion.tabletWord", {
                                count: Math.round(Number(entry.amount)),
                              })
                            : entry.unit}
                        </span>
                        {!hideCalories && kcal != null ? (
                          <span className="block font-mono text-caption tabular-nums text-tertiary">
                            {kcal} kcal
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
