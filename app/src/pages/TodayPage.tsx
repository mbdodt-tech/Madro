import {
  MICRO_STRIP_KEYS,
  micronutrientCoverage,
  NUTRIENT_INFO,
  resolveTargets,
  type NutrientKey,
  type NutrientMap,
} from "@madro/core";
import {
  Button,
  Card,
  Chip,
  MacroRing,
  MicroStrip,
  Panel,
  QualityArc,
  Skeleton,
  useToast,
} from "@madro/ui";
import { Eye, EyeOff, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { persistHideCalories, useProfile } from "../auth/useProfile";
import { useSession } from "../auth/useSession";
import { ErrorState } from "../components/ErrorState";
import { TabShell } from "../components/TabShell";
import { useReferences } from "../lib/useReferences";
import { AddFoodSheet } from "./diary/AddFoodSheet";
import { EntrySheet } from "./diary/EntrySheet";
import { MealSections } from "./diary/MealSections";
import {
  invalidateDiary,
  useDailySummary,
  useDiaryEntries,
  type DiaryEntry,
} from "./diary/useDiary";
import { useTodayActivity } from "./profile/useBody";

/** Korte søjle-labels til striben (grundstof-/vitaminforkortelser). */
const MICRO_LETTERS: Partial<Record<NutrientKey, string>> = {
  vitamin_d_ug: "D",
  iron_mg: "Fe",
  magnesium_mg: "Mg",
  calcium_mg: "Ca",
  potassium_mg: "K",
  vitamin_b12_ug: "B12",
  folate_ug: "Fo",
  zinc_mg: "Zn",
};

function qualityCaptionKey(pct: number | null): string {
  if (pct == null) return "today.quality.empty";
  if (pct >= 85) return "today.quality.veryClean";
  if (pct >= 65) return "today.quality.clean";
  if (pct >= 45) return "today.quality.mixed";
  return "today.quality.processed";
}

export function TodayPage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const today = new Date();

  const {
    data: entries,
    isLoading: entriesLoading,
    isError: entriesError,
    refetch: refetchEntries,
  } = useDiaryEntries(today);
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useDailySummary(today);
  const { data: referenceRows } = useReferences(profile?.rda_region ?? undefined);

  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [adding, setAdding] = useState(false);

  const hideCalories = profile?.hide_calories ?? false;
  const isLoading = entriesLoading || profileLoading || summaryLoading;
  const isError = entriesError || summaryError;
  const retry = () => {
    void refetchEntries();
    void refetchSummary();
  };

  // ---- Tallene kommer fra daily_summaries (Postgres-triggeren, 1.7);
  // formlerne bor stadig i @madro/core og bevogtes af fixtures-tests. ----
  const macros = (summary?.macros ?? {}) as NutrientMap;
  const micros = (summary?.micros ?? {}) as NutrientMap;
  const sharePct = summary?.nova_share != null ? Math.round(Number(summary.nova_share)) : null;
  const targets = resolveTargets(
    (profile?.goals as Record<string, unknown> | null) ?? null,
    {
      sex: profile?.sex,
      birthYear: profile?.birth_year,
      heightCm: profile?.height_cm != null ? Number(profile.height_cm) : null,
      weightKg: profile?.weight_kg != null ? Number(profile.weight_kg) : null,
      activityLevel: profile?.activity_level,
    },
  );
  // Ukendt køn/alder → kvinde/35 som konservativ reference (højere jern-RDA
  // viser lavere dækning frem for at oversælge den). Justeres i Profil senere.
  const referenceProfile = {
    sex: profile?.sex === "male" ? ("male" as const) : ("female" as const),
    age: profile?.birth_year ? today.getFullYear() - profile.birth_year : 35,
    region: profile?.rda_region ?? "DK",
  };
  const coverage = micronutrientCoverage(
    micros,
    referenceRows ?? [],
    referenceProfile,
    MICRO_STRIP_KEYS,
  );
  const microItems = coverage.map((c) => ({
    key: c.key,
    letter: MICRO_LETTERS[c.key] ?? c.key,
    name:
      i18n.language === "da"
        ? NUTRIENT_INFO[c.key].labelDa
        : NUTRIENT_INFO[c.key].labelEn,
    pct: c.pct,
  }));

  const kcalNow = Math.round(Number(summary?.kcal ?? 0));
  // Dagens aktive energi (3.2) lægges neutralt oven i referencen — kun
  // kcal-linjen; ringene beholder grundreferencen (makrobehov skalerer
  // ikke lineært med en gåtur). Ingen formaninger, bare et justeret tal.
  const { data: activity } = useTodayActivity();
  const activeKcal =
    activity?.active_kcal != null ? Math.round(Number(activity.active_kcal)) : 0;
  const kcalTarget = targets.kcal + activeKcal;
  const nf = new Intl.NumberFormat(i18n.language === "da" ? "da-DK" : "en-GB");

  const dateLabel = new Intl.DateTimeFormat(
    i18n.language === "da" ? "da-DK" : "en-GB",
    { weekday: "long", day: "numeric", month: "long" },
  ).format(today);

  const refresh = () => invalidateDiary();
  const initial = (session?.user.email ?? "M")[0]!.toUpperCase();

  return (
    <TabShell>
      {/* Side-dis: binder panelet til papiret (fuld bredde, toner ud) */}
      <div className="page-hero-wash min-h-full">
      <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
        {/* Header: graveret dato-eyebrow over titlen ("Instrumentet") */}
        <header className="flex items-start justify-between">
          <div>
            <p className="text-caption font-semibold uppercase tracking-widest text-tertiary">
              {dateLabel}
            </p>
            <h1 className="text-display text-ink">{t("today.title")}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label={t("today.profileButton")}
            className="grid size-10 place-items-center rounded-pill bg-brand-tint text-small font-semibold text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {initial}
          </button>
        </header>

        {/* Instrumentpanelet — signaturen ("Instrumentet", 2026-07-06) */}
        {isLoading ? (
          <Card>
            <div className="space-y-4" aria-label={t("common.loading")}>
              <Skeleton className="mx-auto h-24 w-40" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
        ) : isError ? (
          <Card>
            <ErrorState onRetry={retry} />
          </Card>
        ) : (
          <Panel>
            <div className="space-y-5">
              <QualityArc
                pct={sharePct}
                label={t("today.quality.label")}
                caption={t(qualityCaptionKey(sharePct))}
              />

              {/* Kalorielinje m. øje-toggle (persisterer hide_calories) */}
              <div>
              <div className="flex items-center justify-center gap-2">
                {hideCalories ? (
                  <span className="text-small text-panel-dim">
                    {t("today.caloriesHidden")}
                  </span>
                ) : (
                  <span className="font-mono text-body tabular-nums text-panel-dim">
                    <strong className="text-h2 font-medium text-panel-ink">
                      {nf.format(kcalNow)}
                    </strong>{" "}
                    / {nf.format(kcalTarget)} kcal
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void persistHideCalories(!hideCalories)}
                  aria-pressed={hideCalories}
                  aria-label={
                    hideCalories ? t("today.showCalories") : t("today.hideCalories")
                  }
                  className="grid size-8 place-items-center rounded-pill text-panel-dim hover:text-panel-ink focus-visible:outline-2 focus-visible:outline-lume"
                >
                  {hideCalories ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {/* Gennemsigtighed (telefonfeedback 2026-07-06): når dagens
                  aktivitet løfter målet, skal man kunne se hvorfor tallet
                  afviger fra profilens reference. */}
              {!hideCalories && activeKcal > 0 ? (
                <p className="mt-1 text-center text-caption text-panel-dim">
                  {t("today.activityIncluded", {
                    active: nf.format(activeKcal),
                    base: nf.format(targets.kcal),
                  })}
                </p>
              ) : null}
              </div>

              {/* Makroringe */}
              <div
                className="flex items-start justify-around"
                role="group"
                aria-label={t("today.macros")}
              >
                <MacroRing
                  macro="protein"
                  value={Number(macros.protein_g ?? 0)}
                  target={targets.protein_g}
                  label={t("today.protein")}
                />
                <MacroRing
                  macro="carb"
                  value={Number(macros.carbohydrate_g ?? 0)}
                  target={targets.carbohydrate_g}
                  label={t("today.carbs")}
                />
                <MacroRing
                  macro="fat"
                  value={Number(macros.fat_g ?? 0)}
                  target={targets.fat_g}
                  label={t("today.fat")}
                />
              </div>

              {/* Mikronæringsstribe */}
              <MicroStrip items={microItems} hint={t("today.microHint")} />
            </div>
          </Panel>
        )}

        {/* Indsigtsteaser — tintet mellemtrin; linker til paywallen (4.3) */}
        <button
          type="button"
          onClick={() => navigate("/premium")}
          className="rounded-xl bg-brand-tint p-4 text-left transition-[filter] hover:brightness-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="flex-1 text-small text-secondary">{t("today.insightTeaser")}</p>
            <Chip>{t("today.premiumChip")}</Chip>
          </div>
        </button>

        {/* Dagens log */}
        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-ink">{t("today.logTitle")}</h2>
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

        {isError ? (
          <ErrorState onRetry={retry} />
        ) : !isLoading && (entries?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-card-edge bg-surface px-5 py-8 text-center shadow-1">
            <p className="text-body text-secondary">{t("today.empty")}</p>
            <p className="mt-1 text-small text-tertiary">{t("diary.emptyHint")}</p>
          </div>
        ) : (
          <MealSections entries={entries ?? []} onEntryClick={setEditing} />
        )}
      </main>
      </div>

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
          day={today}
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
