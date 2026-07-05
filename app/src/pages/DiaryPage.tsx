import {
  computeVerdict,
  scalePer100,
  type NutrientMap,
} from "@madro/core";
import { Button, Skeleton, cn, useToast } from "@madro/ui";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../auth/useProfile";
import { TabShell } from "../components/TabShell";
import { queryClient } from "../lib/queryClient";
import { AddFoodSheet } from "./diary/AddFoodSheet";
import { EntrySheet } from "./diary/EntrySheet";
import {
  addDays,
  DIARY_KEY,
  isSameDay,
  startOfDay,
  useDiaryEntries,
  type DiaryEntry,
} from "./diary/useDiary";
import { MEALS, type Meal } from "./scan/logMeal";

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

export function DiaryPage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: entries, isLoading } = useDiaryEntries(day);
  const isToday = isSameDay(day, new Date());

  const dateLabel = isToday
    ? t("diary.today")
    : isSameDay(day, addDays(new Date(), -1))
      ? t("diary.yesterday")
      : new Intl.DateTimeFormat(i18n.language === "da" ? "da-DK" : "en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(day);

  const byMeal = new Map<Meal, DiaryEntry[]>();
  for (const meal of MEALS) byMeal.set(meal, []);
  for (const entry of entries ?? []) {
    byMeal.get(entry.meal as Meal)?.push(entry);
  }
  const hasEntries = (entries?.length ?? 0) > 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: [DIARY_KEY] });

  return (
    <TabShell>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
        <div className="flex items-center justify-between">
          <h1 className="text-display text-ink">{t("diary.title")}</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAdding(true)}
            aria-label={t("diary.add.title")}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("diary.add.button")}
          </Button>
        </div>

        {/* Dato-navigation */}
        <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface px-2 py-1.5">
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, -1))}
            aria-label={t("diary.prevDay")}
            className="grid size-9 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="text-body font-medium text-ink first-letter:uppercase" aria-live="polite">
            {dateLabel}
          </p>
          <button
            type="button"
            onClick={() => setDay((d) => addDays(d, 1))}
            disabled={isToday}
            aria-label={t("diary.nextDay")}
            className="grid size-9 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label={t("common.loading")}>
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !hasEntries ? (
          <div className="rounded-lg border border-hairline bg-surface px-5 py-8 text-center">
            <p className="text-body text-secondary">{t("diary.empty")}</p>
            <p className="mt-1 text-small text-tertiary">{t("diary.emptyHint")}</p>
          </div>
        ) : (
          MEALS.map((meal) => {
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
                  <h2 className="text-small font-semibold uppercase tracking-wide text-tertiary">
                    {t(`portion.meal.${meal}`)}
                  </h2>
                  {!hideCalories && subtotal != null ? (
                    <span className="font-mono text-caption tabular-nums text-tertiary">
                      {subtotal} kcal
                    </span>
                  ) : null}
                </div>
                <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                  {mealEntries.map((entry) => {
                    const kcal = entryKcal(entry);
                    return (
                      <li key={entry.id}>
                        <button
                          type="button"
                          onClick={() => setEditing(entry)}
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
                              {Math.round(Number(entry.amount))} {entry.unit}
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
          })
        )}
      </main>

      {editing ? (
        <EntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onChanged={(kind) => {
            setEditing(null);
            void refresh();
            show(t(kind === "removed" ? "diary.removed" : "diary.updated"));
          }}
        />
      ) : null}

      {adding ? (
        <AddFoodSheet
          day={day}
          onClose={() => setAdding(false)}
          onLogged={() => {
            setAdding(false);
            void refresh();
            show(t("portion.logged"));
          }}
        />
      ) : null}
    </TabShell>
  );
}
