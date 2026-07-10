import { Button, Skeleton, cn, useToast } from "@madro/ui";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ErrorState } from "../components/ErrorState";
import { TabShell } from "../components/TabShell";
import { AddFoodSheet } from "./diary/AddFoodSheet";
import type { Meal } from "./scan/logMeal";
import { DailyInsightCard } from "./diary/DailyInsightCard";
import { DaySummaryCard } from "./diary/DaySummaryCard";
import { EntrySheet } from "./diary/EntrySheet";
import { MealSections } from "./diary/MealSections";
import {
  addDays,
  dayKey,
  ENTRY_TOAST_KEY,
  invalidateDiary,
  isSameDay,
  startOfDay,
  useDiaryEntries,
  type DiaryEntry,
} from "./diary/useDiary";

export function DiaryPage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();

  // Indsigt→dagbog-link (2026-07-09): ?d=YYYY-MM-DD åbner direkte på den
  // dag. Ugyldige/fremtidige datoer falder tilbage på i dag.
  const [searchParams] = useSearchParams();
  const [day, setDay] = useState(() => {
    const param = searchParams.get("d");
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      const parsed = new Date(`${param}T12:00:00`);
      if (!Number.isNaN(parsed.getTime()) && parsed <= new Date()) {
        return startOfDay(parsed);
      }
    }
    return startOfDay(new Date());
  });
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  // null = lukket; { meal } = åben, evt. med forudvalgt måltid (sektions-plus)
  const [adding, setAdding] = useState<{ meal?: Meal } | null>(null);

  const { data: entries, isLoading, isError, refetch } = useDiaryEntries(day);
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

  const hasEntries = (entries?.length ?? 0) > 0;

  // Ugestriben: mandag-søndag i den valgte dags uge.
  const monday = addDays(startOfDay(day), -((day.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const refresh = () => invalidateDiary();

  return (
    <TabShell>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
        <div className="flex items-center justify-between">
          <h1 className="text-display text-ink">{t("diary.title")}</h1>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAdding({})}
            aria-label={t("diary.add.title")}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("diary.add.button")}
          </Button>
        </div>

        {/* Ugestriben ("Lysende instrument", 2026-07-10): syv dage med
            ét-tryks-navigation; pilene hopper en uge. Fremtid deaktiveret. */}
        <div className="rounded-lg border border-card-edge bg-surface px-2 py-2 shadow-1">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDay((d) => addDays(d, -7))}
              aria-label={t("diary.prevWeek")}
              className="grid size-8 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <p
              className="text-small font-medium text-ink first-letter:uppercase"
              aria-live="polite"
            >
              {dateLabel}
            </p>
            <button
              type="button"
              onClick={() => setDay((d) => (isSameDay(addDays(d, 7), new Date()) || addDays(d, 7) < new Date() ? addDays(d, 7) : startOfDay(new Date())))}
              disabled={isToday}
              aria-label={t("diary.nextWeek")}
              className="grid size-8 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1" role="group" aria-label={t("diary.weekLabel")}>
            {weekDays.map((d) => {
              const selected = isSameDay(d, day);
              const future = startOfDay(d) > startOfDay(new Date());
              return (
                <button
                  key={dayKey(d)}
                  type="button"
                  disabled={future}
                  onClick={() => setDay(startOfDay(d))}
                  aria-pressed={selected}
                  className={cn(
                    "flex flex-col items-center rounded-md py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-brand",
                    selected
                      ? "bg-brand text-on-brand"
                      : future
                        ? "text-tertiary opacity-40"
                        : "text-secondary hover:bg-brand-tint hover:text-brand",
                  )}
                >
                  <span className="text-caption font-semibold uppercase">
                    {new Intl.DateTimeFormat(
                      i18n.language === "da" ? "da-DK" : "en-GB",
                      { weekday: "narrow" },
                    ).format(d)}
                  </span>
                  <span className="font-mono text-small tabular-nums">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label={t("common.loading")}>
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !hasEntries ? (
          <div className="rounded-lg border border-card-edge bg-surface px-5 py-8 text-center shadow-1">
            <p className="text-body text-secondary">{t("diary.empty")}</p>
            <p className="mt-1 text-small text-tertiary">{t("diary.emptyHint")}</p>
          </div>
        ) : (
          <>
            {/* Dagens overblik (2026-07-09): kvalitet, makroer og
                mikro-dækning for den viste dag — kompakt instrumentpanel */}
            <DaySummaryCard day={day} />
            {/* Dagens AI-indsigt (2026-07-10) — gemmes under dagen */}
            <DailyInsightCard day={day} mealsLogged={entries?.length ?? 0} />
            <MealSections
              entries={entries ?? []}
              onEntryClick={setEditing}
              onAddToMeal={(meal) => setAdding({ meal })}
            />
          </>
        )}
      </main>

      {editing ? (
        <EntrySheet
          entry={editing}
          onClose={() => setEditing(null)}
          onChanged={(kind) => {
            setEditing(null);
            void refresh();
            show(t(ENTRY_TOAST_KEY[kind]));
          }}
        />
      ) : null}

      {adding ? (
        <AddFoodSheet
          day={day}
          initialMeal={adding.meal}
          onClose={() => setAdding(null)}
          onLogged={() => {
            setAdding(null);
            void refresh();
            show(t("portion.logged"));
          }}
        />
      ) : null}
    </TabShell>
  );
}
