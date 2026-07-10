import {
  ACTIVITY_TYPES,
  activityKcal,
  DEFAULT_WEIGHT_KG,
} from "@madro/core";
import { Button, Sheet, cn, useToast } from "@madro/ui";
import { Footprints, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../auth/useProfile";
import {
  saveActivityToday,
  useTodayActivity,
} from "../pages/profile/useBody";
import { NumberField, type NumericField } from "./NumberField";

/** Varigheds-valg i minutter — faste trin frem for fri indtastning. */
const DURATIONS = [15, 30, 45, 60, 90] as const;

/** Listen er statisk og aldrig tom — giv TS et garanteret standardvalg. */
const DEFAULT_ACTIVITY = ACTIVITY_TYPES[0]!;

/**
 * Aktivitet i dag på forsiden (brugerønske 2026-07-09): skridt og aktiv
 * energi skrives ind, hvor man alligevel står — uden omvej om profilen.
 * Wearables (Garmin/HealthKit, Fase 5) skriver i de samme felter.
 * Frivilligt og neutralt: ingen krav, ingen point (ansvarlighedsregel).
 */
export function ActivityQuickCard() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const { data: profile } = useProfile();
  const { data: activity } = useTodayActivity();
  const hideCalories = profile?.hide_calories ?? false;

  // Aktivitetsvælgeren (2026-07-10, brugerønske): vælg type + varighed,
  // så beregnes den aktive energi (MET × vægt × timer) — de fleste kan
  // ikke skønne kalorieforbruget selv. Alt præsenteres som estimat.
  const [picking, setPicking] = useState(false);
  const [typeId, setTypeId] = useState(DEFAULT_ACTIVITY.id);
  const [minutes, setMinutes] = useState<number>(30);
  const [adding, setAdding] = useState(false);

  const weightKg =
    profile?.weight_kg != null ? Number(profile.weight_kg) : DEFAULT_WEIGHT_KG;
  const hasOwnWeight = profile?.weight_kg != null;
  const chosen = ACTIVITY_TYPES.find((a) => a.id === typeId) ?? DEFAULT_ACTIVITY;
  const estimatedKcal = activityKcal(chosen.met, weightKg, minutes);
  const da = i18n.language === "da";

  const save = (field: NumericField, value: number) => {
    if (field !== "steps" && field !== "active_kcal") return;
    void saveActivityToday({ [field]: value }).then(() =>
      show(t("profile.saved")),
    );
  };

  const addActivity = async () => {
    setAdding(true);
    try {
      await saveActivityToday({
        active_kcal: (activity?.active_kcal ?? 0) + estimatedKcal,
      });
      show(t("activity.added", { kcal: estimatedKcal }));
      setPicking(false);
    } catch {
      show(t("common.errorBody"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="rounded-lg border border-card-edge bg-surface p-4 shadow-1">
      <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-tertiary">
        <Footprints className="size-3.5 text-brand" aria-hidden="true" />
        {t("profile.activityToday")}
      </h2>
      {/* items-end: toliniet label må ikke skubbe felterne skævt */}
      <div className="mt-3 grid grid-cols-2 items-end gap-3">
        <NumberField
          id="today-steps"
          field="steps"
          label={t("profile.steps")}
          value={activity?.steps ?? null}
          onSave={save}
        />
        {/* Aktiv energi er et kalorietal → respekterer hide_calories */}
        {!hideCalories ? (
          <NumberField
            id="today-active-kcal"
            field="active_kcal"
            label={t("profile.activeKcal")}
            value={activity?.active_kcal ?? null}
            onSave={save}
          />
        ) : null}
      </div>
      {/* Aktivitetsvælgeren: kun når kalorier ikke er skjult (resultatet
          ER et kalorietal). Skridt-feltet er altid tilgængeligt. */}
      {!hideCalories ? (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-small font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("activity.addButton")}
        </button>
      ) : null}
      <p className="mt-2 text-caption text-tertiary">{t("profile.activityNote")}</p>

      <Sheet
        open={picking}
        onOpenChange={(open) => {
          if (!open) setPicking(false);
        }}
        title={t("activity.sheetTitle")}
        showTitle
      >
        <div className="space-y-4">
          <div role="radiogroup" aria-label={t("activity.typeLabel")} className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((a) => {
              const active = a.id === typeId;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTypeId(a.id)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    active
                      ? "bg-brand text-on-brand"
                      : "border border-hairline bg-surface text-secondary hover:bg-brand-tint hover:text-brand",
                  )}
                >
                  {da ? a.labelDa : a.labelEn}
                </button>
              );
            })}
          </div>

          <div role="radiogroup" aria-label={t("activity.durationLabel")} className="flex flex-wrap gap-2">
            {DURATIONS.map((m) => {
              const active = m === minutes;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMinutes(m)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 font-mono text-small font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    active
                      ? "bg-brand text-on-brand"
                      : "border border-hairline bg-surface text-secondary hover:bg-brand-tint hover:text-brand",
                  )}
                >
                  {m} min
                </button>
              );
            })}
          </div>

          {/* Estimatet som mini-aflæsning — lyst glas, mono-tal */}
          <div className="panel-surface rounded-md px-4 py-3 text-center shadow-panel">
            <p className="font-mono text-h2 tabular-nums text-panel-ink">
              ≈ {estimatedKcal} kcal
            </p>
            <p className="mt-0.5 text-caption font-semibold uppercase tracking-widest text-panel-dim">
              {t("activity.estimateLabel")}
            </p>
          </div>
          {!hasOwnWeight ? (
            <p className="text-caption text-tertiary">{t("activity.weightHint")}</p>
          ) : null}

          <Button className="w-full" onClick={() => void addActivity()} disabled={adding}>
            {t("activity.add")}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
