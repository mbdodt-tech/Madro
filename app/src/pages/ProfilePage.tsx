import { resolveTargets } from "@madro/core";
import { Button, Card, Input, Skeleton, cn, useToast } from "@madro/ui";
import { HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { persistHideCalories, persistProfileFields, useProfile } from "../auth/useProfile";
import { useSession } from "../auth/useSession";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { PillGroup } from "../components/PillGroup";
import { TabShell } from "../components/TabShell";
import { supabase } from "../lib/supabase";
import {
  logWeightToday,
  saveActivityToday,
  useTodayActivity,
  useWeightHistory,
} from "./profile/useBody";

/** Grænser spejler DB-checkene (migrationer 20260706200000/210000) — ellers afvises skrivningen. */
const BOUNDS = {
  birth_year: { min: 1900, max: new Date().getFullYear() },
  height_cm: { min: 100, max: 250 },
  weight_kg: { min: 30, max: 300 },
  steps: { min: 0, max: 200000 },
  active_kcal: { min: 0, max: 5000 },
} as const;

type NumericField = keyof typeof BOUNDS;

/** Graveret sektionslabel ("Instrumentet"). */
function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-caption font-semibold uppercase tracking-widest text-tertiary">
      {children}
    </p>
  );
}

/**
 * Talfelt med tekst-spejl (mønster fra PortionForm): gemmer på blur når
 * værdien er gyldig inden for grænserne; ellers rulles feltet tilbage.
 */
function NumberField({
  id,
  field,
  label,
  value,
  onSave,
}: {
  id: string;
  field: NumericField;
  label: string;
  value: number | null;
  onSave: (field: NumericField, value: number) => void;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(text.replace(",", "."));
    const { min, max } = BOUNDS[field];
    if (Number.isFinite(parsed) && parsed >= min && parsed <= max) {
      const rounded =
        field === "birth_year" || field === "steps"
          ? Math.round(parsed)
          : Math.round(parsed * 10) / 10;
      if (rounded !== value) onSave(field, rounded);
    } else {
      setText(value == null ? "" : String(value));
    }
  };

  return (
    <Input
      id={id}
      label={label}
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/**
 * Profil-siden (fase 3.1): kropsprofil → rigtige behovsberegninger i core
 * (Mifflin-St Jeor). Alle felter er frivillige — tom profil = NNR-forenklet
 * reference som hidtil. Neutral copy hele vejen (ansvarlighedsregler).
 */
export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const { data: session } = useSession();
  const { data: profile, isLoading } = useProfile();
  const { data: weightHistory } = useWeightHistory();
  const { data: activity } = useTodayActivity();

  const hideCalories = profile?.hide_calories ?? false;
  const goals = (profile?.goals ?? {}) as Record<string, unknown>;
  const direction = typeof goals.direction === "string" ? goals.direction : "maintain";

  const save = (fields: Parameters<typeof persistProfileFields>[0]) => {
    void persistProfileFields(fields).then(() => show(t("profile.saved")));
  };
  const saveNumber = (field: NumericField, value: number) => {
    if (field === "weight_kg") {
      // Vægt logges som dagens måling og spejles til profilen (3.2)
      void logWeightToday(value).then(() => show(t("profile.saved")));
    } else if (field === "steps" || field === "active_kcal") {
      void saveActivityToday({ [field]: value }).then(() => show(t("profile.saved")));
    } else {
      save({ [field]: value });
    }
  };
  const saveDirection = (id: string) =>
    save({ goals: JSON.parse(JSON.stringify({ ...goals, direction: id })) });

  const targets = resolveTargets(goals, {
    sex: profile?.sex,
    birthYear: profile?.birth_year,
    heightCm: profile?.height_cm != null ? Number(profile.height_cm) : null,
    weightKg: profile?.weight_kg != null ? Number(profile.weight_kg) : null,
    activityLevel: profile?.activity_level,
  });
  const bodyComplete =
    profile?.birth_year != null &&
    profile?.height_cm != null &&
    profile?.weight_kg != null;
  const nf = new Intl.NumberFormat(i18n.language === "da" ? "da-DK" : "en-GB");

  return (
    <TabShell>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
        <header>
          <p className="truncate text-caption font-semibold uppercase tracking-widest text-tertiary">
            {session?.user.email}
          </p>
          <h1 className="text-display text-ink">{t("profile.title")}</h1>
        </header>

        {isLoading || !profile ? (
          <div className="space-y-3" aria-label={t("common.loading")}>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Om dig — grundlaget for energireferencen */}
            <section className="space-y-2">
              <SectionLabel>{t("profile.aboutYou")}</SectionLabel>
              <Card>
                <div className="space-y-4">
                  <p className="text-small text-tertiary">{t("profile.aboutNote")}</p>
                  <PillGroup
                    label={t("profile.sex")}
                    value={profile.sex}
                    onChange={(id) => save({ sex: id })}
                    options={[
                      { id: "female", label: t("profile.sexFemale") },
                      { id: "male", label: t("profile.sexMale") },
                      { id: "unspecified", label: t("profile.sexUnspecified") },
                    ]}
                  />
                  <div className="grid grid-cols-3 items-end gap-3">
                    <NumberField
                      id="profile-birth-year"
                      field="birth_year"
                      label={t("profile.birthYear")}
                      value={profile.birth_year}
                      onSave={saveNumber}
                    />
                    <NumberField
                      id="profile-height"
                      field="height_cm"
                      label={t("profile.heightCm")}
                      value={profile.height_cm != null ? Number(profile.height_cm) : null}
                      onSave={saveNumber}
                    />
                    <NumberField
                      id="profile-weight"
                      field="weight_kg"
                      label={t("profile.weightKg")}
                      value={profile.weight_kg != null ? Number(profile.weight_kg) : null}
                      onSave={saveNumber}
                    />
                  </div>
                  <PillGroup
                    label={t("profile.activity")}
                    value={profile.activity_level}
                    onChange={(id) => save({ activity_level: id })}
                    options={[
                      { id: "sedentary", label: t("profile.activitySedentary") },
                      { id: "moderate", label: t("profile.activityModerate") },
                      { id: "active", label: t("profile.activityActive") },
                    ]}
                  />
                </div>
              </Card>
            </section>

            {/* Vægt over tid — vises først når der er noget at vise */}
            {(weightHistory?.length ?? 0) >= 2 ? (
              <section className="space-y-2">
                <SectionLabel>{t("profile.weightHistory")}</SectionLabel>
                <Card>
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={weightHistory}
                        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                          tickFormatter={(d: string) =>
                            new Intl.DateTimeFormat(
                              i18n.language === "da" ? "da-DK" : "en-GB",
                              { day: "numeric", month: "numeric" },
                            ).format(new Date(d))
                          }
                        />
                        <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                        <Line
                          type="monotone"
                          dataKey="weight_kg"
                          stroke="var(--brand)"
                          strokeWidth={2}
                          dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>
            ) : null}

            {/* Aktivitet i dag — frivillig, neutral (3.2) */}
            <section className="space-y-2">
              <SectionLabel>{t("profile.activityToday")}</SectionLabel>
              <Card>
                <div className="space-y-4">
                  <p className="text-small text-tertiary">{t("profile.activityNote")}</p>
                  {/* items-end: toliniet label må ikke skubbe felterne skævt */}
                  <div className="grid grid-cols-2 items-end gap-3">
                    <NumberField
                      id="profile-steps"
                      field="steps"
                      label={t("profile.steps")}
                      value={activity?.steps ?? null}
                      onSave={saveNumber}
                    />
                    {/* Aktiv energi er et kalorietal → respekterer hide_calories */}
                    {!hideCalories ? (
                      <NumberField
                        id="profile-active-kcal"
                        field="active_kcal"
                        label={t("profile.activeKcal")}
                        value={activity?.active_kcal ?? null}
                        onSave={saveNumber}
                      />
                    ) : null}
                  </div>
                </div>
              </Card>
            </section>

            {/* Mål — kun blide retninger, neutral copy */}
            <section className="space-y-2">
              <SectionLabel>{t("profile.goalTitle")}</SectionLabel>
              <Card>
                <div className="space-y-4">
                  <PillGroup
                    label={t("profile.goal")}
                    value={direction}
                    onChange={saveDirection}
                    options={[
                      { id: "maintain", label: t("profile.goalMaintain") },
                      { id: "gentle_deficit", label: t("profile.goalDeficit") },
                      { id: "gentle_surplus", label: t("profile.goalSurplus") },
                    ]}
                  />
                  <p className="text-small text-tertiary">{t("profile.goalNote")}</p>
                  {/* Referencen — mini-instrumentaflæsning; respekterer hide_calories */}
                  <div className="panel-surface rounded-md px-4 py-3 text-center shadow-panel">
                    <p className="font-mono text-h2 tabular-nums text-panel-ink">
                      {hideCalories
                        ? t("profile.referenceProtein", { grams: targets.protein_g })
                        : `${nf.format(targets.kcal)} kcal`}
                    </p>
                    <p className="mt-0.5 text-caption font-semibold uppercase tracking-widest text-panel-dim">
                      {t("profile.reference")}
                    </p>
                  </div>
                  {!bodyComplete ? (
                    <p className="text-caption text-tertiary">{t("profile.referenceHint")}</p>
                  ) : null}
                </div>
              </Card>
            </section>

            {/* Indstillinger */}
            <section className="space-y-2">
              <SectionLabel>{t("profile.settings")}</SectionLabel>
              <Card>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="profile-hide-kcal" className="text-body text-ink">
                      {t("profile.hideCalories")}
                    </label>
                    <button
                      id="profile-hide-kcal"
                      type="button"
                      role="switch"
                      aria-checked={hideCalories}
                      onClick={() => void persistHideCalories(!hideCalories)}
                      className={cn(
                        "relative h-7 w-12 rounded-pill transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        hideCalories ? "bg-brand" : "bg-hairline",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute top-1 size-5 rounded-pill bg-surface shadow-1 transition-[left]",
                          hideCalories ? "left-6" : "left-1",
                        )}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-body text-ink">{t("common.language")}</span>
                    <LanguageSwitch />
                  </div>
                  <PillGroup
                    label={t("profile.region")}
                    value={profile.rda_region}
                    onChange={(id) => save({ rda_region: id })}
                    options={[
                      { id: "DK", label: "DK" },
                      { id: "EU", label: "EU" },
                      { id: "US", label: "US" },
                    ]}
                  />
                  <div className="flex items-center justify-between border-t border-hairline pt-4">
                    <Link
                      className="text-small font-medium text-brand hover:text-brand-hover"
                      to="/design"
                    >
                      {t("home.designLink")}
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void supabase.auth.signOut()}
                    >
                      {t("common.logout")}
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            {/* Støtte — altid tilgængelig fra indstillinger (ansvarlighedsregel) */}
            <div className="rounded-xl bg-brand-tint p-4">
              <div className="flex items-start gap-3">
                <HeartHandshake className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="text-body font-medium text-ink">{t("profile.supportTitle")}</p>
                  <p className="text-small text-secondary">{t("profile.supportBody")}</p>
                  <a
                    href="https://www.lmsos.dk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-small font-medium text-brand hover:text-brand-hover"
                  >
                    {t("profile.supportLink")}
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </TabShell>
  );
}
