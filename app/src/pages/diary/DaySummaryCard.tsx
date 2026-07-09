import {
  MICRO_STRIP_KEYS,
  micronutrientCoverage,
  NUTRIENT_INFO,
  type NutrientKey,
  type NutrientMap,
} from "@madro/core";
import { MicroStrip } from "@madro/ui";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../auth/useProfile";
import { useReferences } from "../../lib/useReferences";
import { MICRO_LETTERS, useDailySummary } from "./useDiary";

/**
 * Dagens overblik i dagbogen (brugerønske 2026-07-09): kvalitet, energi,
 * makroer og mikro-dækning for den viste dag — som et kompakt
 * instrumentpanel, så aflæsninger altid bor på den mørke signaturflade.
 * "Mest at hente" peger fremad (aldrig bagud-bebrejdende).
 */
export function DaySummaryCard({ day }: { day: Date }) {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { data: referenceRows } = useReferences(profile?.rda_region ?? undefined);
  const { data: summary } = useDailySummary(day);
  const hideCalories = profile?.hide_calories ?? false;

  if (!summary) return null;

  const macros = (summary.macros ?? {}) as NutrientMap;
  const micros = (summary.micros ?? {}) as NutrientMap;
  const sharePct =
    summary.nova_share != null ? Math.round(Number(summary.nova_share)) : null;
  const kcal = summary.kcal != null ? Math.round(Number(summary.kcal)) : null;

  const referenceProfile = {
    sex: profile?.sex === "male" ? ("male" as const) : ("female" as const),
    age: profile?.birth_year
      ? new Date().getFullYear() - profile.birth_year
      : 35,
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
  const lowest = coverage
    .filter((c): c is typeof c & { pct: number } => c.pct != null && c.pct < 80)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  const macroCells: { key: NutrientKey; label: string }[] = [
    { key: "protein_g", label: t("today.protein") },
    { key: "carbohydrate_g", label: t("today.carbs") },
    { key: "fat_g", label: t("today.fat") },
  ];

  return (
    <section className="panel-surface rounded-xl p-4 shadow-panel">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-caption font-semibold uppercase tracking-widest text-panel-dim">
          {t("diary.summary.title")}
        </h2>
        {sharePct != null ? (
          <p className="glow-reading font-mono text-h2 tabular-nums text-lume">
            {sharePct}
            <small className="text-small text-panel-dim">%</small>
          </p>
        ) : null}
      </div>

      <div className="mt-2 mb-4 flex items-baseline justify-between gap-2">
        {macroCells.map(({ key, label }) => (
          <p key={key} className="text-center">
            <span className="block font-mono text-body font-medium tabular-nums text-panel-ink">
              {Math.round(Number(macros[key] ?? 0))}
              <small className="text-caption text-panel-dim"> g</small>
            </span>
            <span className="block text-caption font-semibold uppercase tracking-widest text-panel-dim">
              {label}
            </span>
          </p>
        ))}
        {!hideCalories && kcal != null ? (
          <p className="text-center">
            <span className="block font-mono text-body font-medium tabular-nums text-panel-ink">
              {kcal}
            </span>
            <span className="block text-caption font-semibold uppercase tracking-widest text-panel-dim">
              kcal
            </span>
          </p>
        ) : null}
      </div>

      <MicroStrip items={microItems} hint={t("diary.summary.microHint")} />

      {lowest.length > 0 ? (
        <p className="mt-3 text-caption text-panel-dim">
          {t("diary.summary.lowest")}{" "}
          {lowest
            .map(
              (c) =>
                `${
                  i18n.language === "da"
                    ? NUTRIENT_INFO[c.key].labelDa
                    : NUTRIENT_INFO[c.key].labelEn
                } ${c.pct} %`,
            )
            .join(" · ")}
        </p>
      ) : null}
    </section>
  );
}
