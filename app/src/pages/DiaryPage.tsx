import { Button, Skeleton, useToast } from "@madro/ui";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState } from "../components/ErrorState";
import { TabShell } from "../components/TabShell";
import { AddFoodSheet } from "./diary/AddFoodSheet";
import { EntrySheet } from "./diary/EntrySheet";
import { MealSections } from "./diary/MealSections";
import {
  addDays,
  invalidateDiary,
  isSameDay,
  startOfDay,
  useDiaryEntries,
  type DiaryEntry,
} from "./diary/useDiary";

export function DiaryPage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();

  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [adding, setAdding] = useState(false);

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

  const refresh = () => invalidateDiary();

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
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : !hasEntries ? (
          <div className="rounded-lg border border-hairline bg-surface px-5 py-8 text-center">
            <p className="text-body text-secondary">{t("diary.empty")}</p>
            <p className="mt-1 text-small text-tertiary">{t("diary.emptyHint")}</p>
          </div>
        ) : (
          <MealSections entries={entries ?? []} onEntryClick={setEditing} />
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
