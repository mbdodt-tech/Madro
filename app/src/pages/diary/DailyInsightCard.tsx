import {
  AiError,
  MICRO_STRIP_KEYS,
  micronutrientCoverage,
  NUTRIENT_INFO,
  type NutrientMap,
} from "@madro/core";
import { Button, Skeleton } from "@madro/ui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../auth/useProfile";
import { aiClient } from "../../lib/aiClient";
import { useReferences } from "../../lib/useReferences";
import { PremiumTeaser } from "../../payments/PremiumTeaser";
import { useEntitlements } from "../../payments/useEntitlements";
import {
  saveDailyInsight,
  useDailyInsight,
  type InsightContent,
} from "../insights/useInsights";
import { useDailySummary } from "./useDiary";

/**
 * Dagens AI-indsigt i dagbogen (2026-07-10, brugerønske): en kort
 * fortælling om den viste dag, gemt under dagens registrering, med
 * "Generér ny" til at erstatte den. Premium (AI-kald); ikke-premium
 * ser en teaser, når dagen har data. Kalorier sendes ALDRIG med, når
 * hide_calories er slået til.
 */
export function DailyInsightCard({
  day,
  mealsLogged,
}: {
  day: Date;
  /** Antal poster den viste dag (fra dagbogens liste). */
  mealsLogged: number;
}) {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { premium, ready } = useEntitlements();
  const { data: summary } = useDailySummary(day);
  const { data: insight, isLoading: insightLoading } = useDailyInsight(day);
  const { data: referenceRows } = useReferences(profile?.rda_region ?? undefined);
  const hideCalories = profile?.hide_calories ?? false;

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Ingen data for dagen → intet at fortælle om.
  if (!summary) return null;
  if (!ready) return <Skeleton className="h-16 w-full" />;
  if (!premium) return <PremiumTeaser body={t("diary.insight.gateBody")} />;

  const locale = i18n.language === "da" ? ("da" as const) : ("en" as const);

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const micros = (summary.micros ?? {}) as NutrientMap;
      const coverage = micronutrientCoverage(
        micros,
        referenceRows ?? [],
        {
          sex: profile?.sex === "male" ? ("male" as const) : ("female" as const),
          age: profile?.birth_year
            ? new Date().getFullYear() - profile.birth_year
            : 35,
          region: profile?.rda_region ?? "DK",
        },
        MICRO_STRIP_KEYS,
      );
      const lowestMicros = coverage
        .filter((c): c is typeof c & { pct: number } => c.pct != null)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3)
        .map((c) => ({
          name:
            locale === "da"
              ? NUTRIENT_INFO[c.key].labelDa
              : NUTRIENT_INFO[c.key].labelEn,
          pct: Math.round(c.pct),
        }));
      const macros = (summary.macros ?? {}) as NutrientMap;
      const result = await aiClient.callAi("daily_insight", {
        locale,
        stats: {
          mealsLogged,
          ...(hideCalories || summary.kcal == null
            ? {}
            : { kcal: Math.round(Number(summary.kcal)) }),
          ...(summary.nova_share != null
            ? { novaShare: Math.round(Number(summary.nova_share)) }
            : {}),
          ...(macros.protein_g != null
            ? { proteinG: Math.round(Number(macros.protein_g)) }
            : {}),
          lowestMicros,
        },
      });
      const content: InsightContent = {
        narrative: result.narrative,
        suggestions: result.suggestions,
        stats: { day: day.toDateString() },
      };
      await saveDailyInsight(day, content);
    } catch (err) {
      if (err instanceof AiError && err.code === "missing_anthropic_key") {
        setGenError(t("diary.write.aiNotConfigured"));
      } else if (err instanceof AiError && err.code === "rate_limited") {
        setGenError(t("diary.write.rateLimited"));
      } else {
        setGenError(t("common.errorBody"));
      }
    } finally {
      setGenerating(false);
    }
  };

  const content = insight?.content as InsightContent | null | undefined;

  return (
    <section className="rounded-lg border border-card-edge bg-surface p-4 shadow-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-widest text-tertiary">
          <Sparkles className="size-3.5 text-brand" aria-hidden="true" />
          {t("diary.insight.title")}
        </h2>
        {content ? (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={generating}
            className="rounded-sm text-caption font-medium text-brand hover:text-brand-hover disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {generating ? t("insights.generating") : t("diary.insight.regenerate")}
          </button>
        ) : null}
      </div>

      {insightLoading ? (
        <Skeleton className="mt-3 h-12 w-full" />
      ) : content ? (
        <div className="mt-2 space-y-2">
          <p className="text-small text-ink">{content.narrative}</p>
          {content.suggestions.length > 0 ? (
            <ul className="space-y-1">
              {content.suggestions.map((s) => (
                <li key={s.food} className="text-small text-secondary">
                  <span className="font-medium text-ink first-letter:uppercase">
                    {s.food}
                  </span>{" "}
                  — {s.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void generate()}
            disabled={generating}
          >
            {generating ? t("insights.generating") : t("diary.insight.generate")}
          </Button>
        </div>
      )}

      {genError ? (
        <p role="alert" className="mt-3 rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {genError}
        </p>
      ) : null}
    </section>
  );
}
