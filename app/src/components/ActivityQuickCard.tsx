import { useToast } from "@madro/ui";
import { Footprints } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../auth/useProfile";
import {
  saveActivityToday,
  useTodayActivity,
} from "../pages/profile/useBody";
import { NumberField, type NumericField } from "./NumberField";

/**
 * Aktivitet i dag på forsiden (brugerønske 2026-07-09): skridt og aktiv
 * energi skrives ind, hvor man alligevel står — uden omvej om profilen.
 * Wearables (Garmin/HealthKit, Fase 5) skriver i de samme felter.
 * Frivilligt og neutralt: ingen krav, ingen point (ansvarlighedsregel).
 */
export function ActivityQuickCard() {
  const { t } = useTranslation();
  const { show } = useToast();
  const { data: profile } = useProfile();
  const { data: activity } = useTodayActivity();
  const hideCalories = profile?.hide_calories ?? false;

  const save = (field: NumericField, value: number) => {
    if (field !== "steps" && field !== "active_kcal") return;
    void saveActivityToday({ [field]: value }).then(() =>
      show(t("profile.saved")),
    );
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
      <p className="mt-2 text-caption text-tertiary">{t("profile.activityNote")}</p>
    </section>
  );
}
