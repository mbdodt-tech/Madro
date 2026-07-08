import { hasMicroData, isSupplementFood, type NutrientMap } from "@madro/core";
import { Button, Input, Sheet } from "@madro/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PortionForm } from "../../components/PortionForm";
import { searchFoodsRanked, type FoodHit } from "../../scanner/useLookup";
import type { Meal } from "../scan/logMeal";
import { adoptVerifiedNutriments, findVerifiedMatches } from "./enrichment";
import {
  deleteEntry,
  updateEntry,
  type DiaryEntry,
  type EntryChangeKind,
} from "./useDiary";

/**
 * Redigér/slet en dagbogspost: samme PortionForm som scan-flowet,
 * forudfyldt. Sletning kræver et ekstra tryk (neutral tone — ingen
 * skyld-sprog, jf. ansvarlighedsreglerne).
 */
export function EntrySheet({
  entry,
  onClose,
  onChanged,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onChanged: (kind: EntryChangeKind) => void;
}) {
  const { t } = useTranslation();

  const [grams, setGrams] = useState(Math.round(Number(entry.amount)));
  const [meal, setMeal] = useState<Meal>(entry.meal as Meal);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Verificeret-opslag-reparation (2026-07-08): kun for brugerens egne
  // custom-varer uden mikroværdier — dem kan RLS lade os opdatere.
  const [candidates, setCandidates] = useState<FoodHit[] | null>(null);
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichError, setEnrichError] = useState(false);

  // Skift opslag (2026-07-08): byt postens fødevare til et andet opslag —
  // fx en OFF-vare uden mikrodata → Fridas verificerede pendant.
  // Mængde og måltid beholdes; summaryen genberegnes af triggeren.
  const [swapping, setSwapping] = useState(false);
  const [swapQuery, setSwapQuery] = useState("");
  const [swapResults, setSwapResults] = useState<FoodHit[] | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);

  useEffect(() => {
    if (!swapping) return;
    const q = swapQuery.trim();
    if (q.length < 2) {
      setSwapResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      searchFoodsRanked(q)
        .then((hits) => {
          if (!cancelled) {
            setSwapResults(hits.filter((f) => f.id !== entry.foods?.id).slice(0, 5));
          }
        })
        .catch(() => {
          if (!cancelled) setSwapResults([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [swapping, swapQuery, entry.foods?.id]);

  const swapTo = async (food: FoodHit) => {
    setSwapBusy(true);
    setError(false);
    try {
      await updateEntry(entry.id, { amountGrams: grams, meal, foodId: food.id });
      onChanged("swapped");
    } catch {
      setError(true);
      setSwapBusy(false);
    }
  };

  const nutriments = (entry.foods?.nutriments ?? {}) as NutrientMap;
  const canEnrich =
    entry.foods != null &&
    entry.foods.source === "custom" &&
    !hasMicroData(nutriments);

  const loadCandidates = async () => {
    if (!entry.foods) return;
    setEnrichBusy(true);
    setEnrichError(false);
    try {
      setCandidates(await findVerifiedMatches(entry.foods.name));
    } catch {
      setEnrichError(true);
    } finally {
      setEnrichBusy(false);
    }
  };

  const enrich = async (verified: FoodHit) => {
    if (!entry.foods) return;
    setEnrichBusy(true);
    setEnrichError(false);
    try {
      const updated = await adoptVerifiedNutriments(entry.foods, verified);
      if (!updated) throw new Error("rls_denied");
      // Summary-triggeren lytter kun på log_entries — gem posten igen,
      // så dagens tal genberegnes med de nye næringsværdier.
      await updateEntry(entry.id, { amountGrams: grams, meal });
      onChanged("enriched");
    } catch {
      setEnrichError(true);
      setEnrichBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      await updateEntry(entry.id, { amountGrams: grams, meal });
      onChanged("saved");
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await deleteEntry(entry.id);
      onChanged("removed");
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={entry.foods?.name ?? t("diary.entry.unknownFood")}
      showTitle
    >
      <div className="space-y-4">
        {entry.foods?.brand ? (
          <p className="-mt-2 text-small text-secondary">{entry.foods.brand}</p>
        ) : null}

        {/* Skift opslag: samme post, andet opslag i biblioteket */}
        {swapping ? (
          <div className="space-y-2 rounded-md border border-hairline bg-bg p-3">
            <Input
              id="entry-swap-search"
              label={t("diary.swap.label")}
              placeholder={t("diary.swap.placeholder")}
              value={swapQuery}
              onChange={(e) => setSwapQuery(e.target.value)}
            />
            <p className="text-caption text-tertiary">{t("diary.swap.hint")}</p>
            {swapResults != null && swapResults.length === 0 ? (
              <p className="text-small text-tertiary">{t("diary.swap.none")}</p>
            ) : null}
            {(swapResults ?? []).map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant="secondary"
                className="w-full justify-between"
                onClick={() => void swapTo(f)}
                disabled={swapBusy || busy}
              >
                <span className="truncate">{f.name}</span>
                <span className="shrink-0 text-caption text-tertiary">
                  {t(`scan.source.${f.source}`)}
                </span>
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSwapping(false)}
              disabled={swapBusy}
            >
              {t("diary.swap.cancel")}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="-mt-1 self-start"
            onClick={() => {
              setSwapQuery(entry.foods?.name ?? "");
              setSwapping(true);
            }}
            disabled={busy}
          >
            {t("diary.swap.button")}
          </Button>
        )}

        <PortionForm
          grams={grams}
          meal={meal}
          onGrams={setGrams}
          onMeal={setMeal}
          energyKcalPer100={nutriments.energy_kcal ?? null}
          tablets={entry.foods != null && isSupplementFood(entry.foods)}
        />

        {canEnrich ? (
          <div className="rounded-md bg-brand-tint px-4 py-3">
            <p className="text-small text-secondary">{t("diary.enrich.hint")}</p>
            {candidates == null ? (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={() => void loadCandidates()}
                disabled={enrichBusy || busy}
              >
                {t("diary.enrich.fetch")}
              </Button>
            ) : candidates.length === 0 ? (
              <p className="mt-2 text-small text-tertiary">{t("diary.enrich.none")}</p>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-caption text-tertiary">{t("diary.enrich.choose")}</p>
                {candidates.map((c) => (
                  <Button
                    key={c.id}
                    size="sm"
                    variant="secondary"
                    className="w-full justify-between"
                    onClick={() => void enrich(c)}
                    disabled={enrichBusy || busy}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="shrink-0 text-caption text-tertiary">
                      {t(`scan.source.${c.source}`)}
                    </span>
                  </Button>
                ))}
              </div>
            )}
            {enrichError ? (
              <p className="mt-2 text-small text-v-bad" role="alert">
                {t("diary.enrich.error")}
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad" role="alert">
            {t("diary.entry.error")}
          </p>
        ) : null}

        <div className="space-y-2">
          <Button className="w-full" onClick={() => void save()} disabled={busy}>
            {t("diary.entry.save")}
          </Button>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                {t("diary.entry.keep")}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 text-v-bad"
                onClick={() => void remove()}
                disabled={busy}
              >
                {t("diary.entry.confirmRemove")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
            >
              {t("diary.entry.remove")}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
