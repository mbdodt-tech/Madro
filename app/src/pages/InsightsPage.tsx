import {
  AiError,
  buildWeeklyStats,
  type DaySummaryInput,
  type NutrientMap,
  type WeeklyStats,
} from "@madro/core";
import { Button, Card, Chip, Skeleton, useToast } from "@madro/ui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useProfile } from "../auth/useProfile";
import { ErrorState } from "../components/ErrorState";
import { TabShell } from "../components/TabShell";
import { aiClient } from "../lib/aiClient";
import { useReferences } from "../lib/useReferences";
import { useEntitlements } from "../payments/useEntitlements";
import { addDays, dayKey } from "./diary/useDiary";
import {
  mondayOf,
  saveWeeklyInsight,
  useWeeklyInsight,
  useWeekSummaries,
  type InsightContent,
} from "./insights/useInsights";

/** Buens farvetærskler genbrugt til søjlerne (v-*-tokens via CSS-vars). */
function barColor(pct: number): string {
  if (pct >= 85) return "var(--v-excellent)";
  if (pct >= 65) return "var(--v-good)";
  if (pct >= 45) return "var(--v-mid)";
  if (pct >= 25) return "var(--v-poor)";
  return "var(--v-bad)";
}

export function InsightsPage() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const { data: profile } = useProfile();
  const { weeklyInsights, ready: entitlementsReady } = useEntitlements();
  const hideCalories = profile?.hide_calories ?? false;

  const weekStart = mondayOf(new Date());
  const { data: summaries, isLoading, isError, refetch } = useWeekSummaries(weekStart);
  const { data: insight, isLoading: insightLoading } = useWeeklyInsight(weekStart);
  const { data: referenceRows } = useReferences(profile?.rda_region ?? undefined);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const locale = i18n.language === "da" ? "da" : "en";
  const intl = locale === "da" ? "da-DK" : "en-GB";

  // ---- Ugens 7 dage → core-statistik ----
  const byDay = new Map((summaries ?? []).map((s) => [s.day, s]));
  const days: DaySummaryInput[] = Array.from({ length: 7 }, (_, i) => {
    const key = dayKey(addDays(weekStart, i));
    const row = byDay.get(key);
    return {
      day: key,
      kcal: row?.kcal != null ? Number(row.kcal) : null,
      macros: (row?.macros ?? {}) as NutrientMap,
      micros: (row?.micros ?? {}) as NutrientMap,
      novaShare: row?.nova_share != null ? Number(row.nova_share) : null,
    };
  });
  const referenceProfile = {
    sex: profile?.sex === "male" ? ("male" as const) : ("female" as const),
    age: profile?.birth_year
      ? new Date().getFullYear() - profile.birth_year
      : 35,
    region: profile?.rda_region ?? "DK",
  };
  const stats: WeeklyStats = buildWeeklyStats(days, referenceRows ?? [], referenceProfile);

  const chartData = stats.trend.map((p, i) => ({
    ...p,
    label: new Intl.DateTimeFormat(intl, { weekday: "short" }).format(
      addDays(weekStart, i),
    ),
  }));

  const generate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const result = await aiClient.callAi("weekly_insight", {
        locale,
        stats: {
          daysLogged: stats.daysLogged,
          // hide_calories: kalorier sendes slet ikke — fortællingen kan
          // dermed ikke nævne dem.
          ...(hideCalories || stats.avgKcal == null
            ? {}
            : { avgKcal: stats.avgKcal }),
          ...(stats.avgNovaShare != null
            ? { avgNovaShare: stats.avgNovaShare }
            : {}),
          ...(stats.avgProteinG != null
            ? { avgProteinG: stats.avgProteinG }
            : {}),
          lowestMicros: stats.lowestMicros.map((m) => ({
            name: m.name[locale],
            pct: m.pct,
          })),
        },
      });
      const content: InsightContent = {
        narrative: result.narrative,
        suggestions: result.suggestions,
        stats: { daysLogged: stats.daysLogged, avgNovaShare: stats.avgNovaShare },
      };
      await saveWeeklyInsight(weekStart, content);
      show(t("insights.generated"));
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

  const weekLabel = `${new Intl.DateTimeFormat(intl, { day: "numeric", month: "short" }).format(weekStart)} – ${new Intl.DateTimeFormat(intl, { day: "numeric", month: "short" }).format(addDays(weekStart, 6))}`;
  const content = insight?.content as InsightContent | null | undefined;

  return (
    <TabShell>
      <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
        <header>
          <p className="text-small text-secondary first-letter:uppercase">{weekLabel}</p>
          <h1 className="text-display text-ink">{t("insights.title")}</h1>
        </header>

        {isLoading ? (
          <div className="space-y-3" aria-label={t("common.loading")}>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <>
            {/* Kvalitetstrend (primær) + evt. kcal-linje */}
            <Card>
              <h2 className="mb-1 text-h2 text-ink">{t("insights.trendTitle")}</h2>
              <p className="mb-3 text-caption text-tertiary">
                {t("insights.trendNote")}
              </p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={{ stroke: "var(--hairline)" }}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                    />
                    <Bar dataKey="novaShare" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {chartData.map((p) => (
                        <Cell
                          key={p.day}
                          fill={p.novaShare != null ? barColor(p.novaShare) : "var(--hairline)"}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Nøgletal */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="text-center">
                <p className="font-mono text-h2 tabular-nums text-ink">{stats.daysLogged}</p>
                <p className="text-caption text-tertiary">{t("insights.daysLogged")}</p>
              </Card>
              <Card className="text-center">
                <p className="font-mono text-h2 tabular-nums text-ink">
                  {stats.avgNovaShare != null ? `${stats.avgNovaShare}%` : "–"}
                </p>
                <p className="text-caption text-tertiary">{t("insights.avgQuality")}</p>
              </Card>
              <Card className="text-center">
                {hideCalories ? (
                  <p className="font-mono text-h2 tabular-nums text-ink">·</p>
                ) : (
                  <p className="font-mono text-h2 tabular-nums text-ink">
                    {stats.avgKcal ?? "–"}
                  </p>
                )}
                <p className="text-caption text-tertiary">
                  {hideCalories ? t("insights.hidden") : t("insights.avgKcal")}
                </p>
              </Card>
            </div>

            {/* AI-fortælling / teaser */}
            {!entitlementsReady ? (
              <Skeleton className="h-24 w-full" />
            ) : !weeklyInsights ? (
              <Card>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-body font-medium text-ink">
                      {t("insights.premiumTitle")}
                    </p>
                    <p className="text-small text-secondary">
                      {t("insights.premiumBody")}
                    </p>
                    <Chip>{t("insights.premiumChip")}</Chip>
                  </div>
                </div>
              </Card>
            ) : insightLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : content ? (
              <Card>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                  <div className="space-y-3">
                    <p className="text-body text-ink">{content.narrative}</p>
                    {content.suggestions.length > 0 ? (
                      <ul className="space-y-2">
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
                </div>
              </Card>
            ) : stats.daysLogged < 2 ? (
              <Card>
                <p className="text-small text-secondary">{t("insights.tooFewDays")}</p>
              </Card>
            ) : (
              <Card>
                <div className="space-y-3">
                  <p className="text-small text-secondary">{t("insights.generateHint")}</p>
                  {genError ? (
                    <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
                      {genError}
                    </p>
                  ) : null}
                  <Button
                    className="w-full"
                    onClick={() => void generate()}
                    disabled={generating}
                  >
                    {generating ? t("insights.generating") : t("insights.generate")}
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </TabShell>
  );
}
