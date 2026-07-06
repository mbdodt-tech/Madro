import { AiError, verdictLevelFor } from "@madro/core";
import { Chip, Skeleton, VerdiktBadge } from "@madro/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../auth/useProfile";
import type { FoodHit } from "../../scanner/useLookup";
import { getOrCreateAlternatives, type Alternative } from "./alternatives";

/**
 * "Vis bedre alternativ" (fase 2.5): forslag i samme kategori med
 * garanteret højere verdikt-score, AI-vægtet efter ugens mangler.
 * Tap åbner alternativets eget verdikt-ark.
 */
export function AlternativesStep({
  food,
  scanId,
  onBack,
  onPick,
}: {
  food: FoodHit;
  scanId: string | null;
  onBack: () => void;
  onPick: (food: FoodHit) => void;
}) {
  const { t, i18n } = useTranslation();
  const { data: profile } = useProfile();

  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getOrCreateAlternatives(
          scanId,
          food,
          i18n.language === "da" ? "da" : "en",
          {
            sex: profile?.sex,
            birth_year: profile?.birth_year,
            rda_region: profile?.rda_region,
          },
        );
        if (!cancelled) setAlternatives(result);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AiError && err.code === "missing_anthropic_key") {
          setError(t("diary.write.aiNotConfigured"));
        } else if (err instanceof AiError && err.code === "rate_limited") {
          setError(t("diary.write.rateLimited"));
        } else {
          setError(t("common.errorBody"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [food.id, scanId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("verdict.alternatives.back")}
          className="grid size-10 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h3 className="truncate text-h2 text-ink">{t("verdict.alternatives.title")}</h3>
          <p className="text-small text-secondary">{t("verdict.alternatives.subtitle")}</p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : alternatives == null ? (
        <div className="space-y-3" aria-live="polite">
          <p className="text-small text-tertiary">{t("verdict.alternatives.loading")}</p>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : alternatives.length === 0 ? (
        // Ærlig, positiv besked: intet i kategorien slår varens score.
        <div className="rounded-lg border border-card-edge bg-surface px-5 py-6 text-center shadow-1">
          <p className="text-body text-secondary">{t("verdict.alternatives.none")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alternatives.map((alt) => (
            <li key={alt.food.id}>
              <button
                type="button"
                onClick={() => onPick(alt.food)}
                className="w-full space-y-2 rounded-lg border border-card-edge bg-surface px-4 py-3 text-left shadow-1 hover:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-body font-medium text-ink">
                      {alt.food.name}
                    </span>
                    {alt.food.brand ? (
                      <span className="block truncate text-caption text-tertiary">
                        {alt.food.brand}
                      </span>
                    ) : null}
                  </span>
                  <VerdiktBadge
                    level={verdictLevelFor(alt.score)}
                    label={`${alt.score}/100`}
                  />
                </span>
                {alt.reason ? (
                  <span className="block text-small text-secondary">{alt.reason}</span>
                ) : null}
                <Chip>{t(`scan.source.${alt.food.source}`)}</Chip>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
