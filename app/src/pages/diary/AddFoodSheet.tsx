import { isSupplementFood, type NutrientMap } from "@madro/core";
import { Button, Chip, Input, Sheet, Skeleton, Tabs } from "@madro/ui";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { PortionForm } from "../../components/PortionForm";
import { PremiumTeaser } from "../../payments/PremiumTeaser";
import { useEntitlements } from "../../payments/useEntitlements";
import { searchFoods, type FoodHit } from "../../scanner/useLookup";
import { defaultMeal, logMeal, type Meal } from "../scan/logMeal";
import { isSameDay } from "./useDiary";
import { WriteMealTab } from "./WriteMealTab";

/**
 * "+"-flowet med to faner: "Søg" (tekstsøgning på tværs af kilder m.
 * kilde-badge → portionsvalg) og "Skriv" (naturligt sprog → AI-forslag,
 * fase 2.1). Logger på den viste dag.
 */
export function AddFoodSheet({
  day,
  initialMeal,
  onClose,
  onLogged,
}: {
  day: Date;
  /** Forudvalgt måltid (sektions-plus, 2026-07-09); ellers efter klokkeslæt. */
  initialMeal?: Meal;
  onClose: () => void;
  onLogged: () => void;
}) {
  const { t } = useTranslation();
  const { premium, ready: entitlementsReady } = useEntitlements();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[] | null>(null);
  const [searchFailed, setSearchFailed] = useState(false);
  const [selected, setSelected] = useState<FoodHit | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState<Meal>(
    () => initialMeal ?? defaultMeal(new Date().getHours()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  // Sekvensnummer dropper forsinkede svar fra ældre søgninger, så et
  // gammelt "ha"-svar aldrig overskriver resultaterne for "havregryn".
  const searchSeq = useRef(0);
  const runSearch = async (value: string) => {
    setQuery(value);
    const seq = ++searchSeq.current;
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    try {
      const hits = await searchFoods(value);
      if (seq === searchSeq.current) {
        setResults(hits);
        setSearchFailed(false);
      }
    } catch {
      if (seq === searchSeq.current) {
        setResults(null);
        setSearchFailed(true);
      }
    }
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(false);
    try {
      // På en tidligere dag lægges posten kl. 12 den dag; i dag → nu.
      const consumedAt = isSameDay(day, new Date())
        ? undefined
        : new Date(new Date(day).setHours(12, 0, 0, 0));
      await logMeal({
        foodId: selected.id,
        amountGrams: grams,
        meal,
        scanId: null,
        consumedAt,
        unit: tablets ? "tablet" : "g",
      });
      onLogged();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const nutriments = (selected?.nutriments ?? {}) as NutrientMap;
  const tablets = selected != null && isSupplementFood(selected);

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("diary.add.title")}
      showTitle
    >
      {selected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t("portion.back")}
              className="grid size-10 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h3 className="truncate text-h2 text-ink">{selected.name}</h3>
              <p className="text-small text-secondary">{t("portion.howMuch")}</p>
            </div>
          </div>

          <PortionForm
            grams={grams}
            meal={meal}
            onGrams={setGrams}
            onMeal={setMeal}
            energyKcalPer100={nutriments.energy_kcal ?? null}
            tablets={tablets}
          />

          {error ? (
            <p className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad" role="alert">
              {t("portion.error")}
            </p>
          ) : null}

          <Button className="w-full" onClick={() => void submit()} disabled={busy}>
            {t("portion.log")}
          </Button>
        </div>
      ) : (
        <Tabs
          listLabel={t("diary.add.tabsLabel")}
          items={[
            {
              value: "search",
              label: t("diary.add.tabSearch"),
              content: (
                <div className="space-y-4">
                  <Input
                    id="diary-search"
                    label={t("scan.searchLabel")}
                    placeholder={t("scan.searchPlaceholder")}
                    value={query}
                    onChange={(e) => void runSearch(e.target.value)}
                  />
                  {searchFailed ? (
                    <p role="alert" className="text-small text-v-bad">
                      {t("diary.add.searchError")}
                    </p>
                  ) : results !== null ? (
                    results.length > 0 ? (
                      <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                        {results.map((food) => (
                          <li key={food.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(food);
                                setGrams(isSupplementFood(food) ? 1 : 100);
                              }}
                              className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-body text-ink">
                                  {food.name}
                                </span>
                                {food.brand ? (
                                  <span className="block truncate text-caption text-tertiary">
                                    {food.brand}
                                  </span>
                                ) : null}
                              </span>
                              <Chip>{t(`scan.source.${food.source}`)}</Chip>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-small text-tertiary">{t("scan.noResults")}</p>
                    )
                  ) : (
                    <p className="text-small text-tertiary">{t("diary.add.hint")}</p>
                  )}
                </div>
              ),
            },
            {
              value: "write",
              label: t("diary.add.tabWrite"),
              // Skriv-et-måltid er premium (gating 2026-07-09): AI-kaldene
              // bor bag paywallen; søge-fanen er altid gratis.
              content: !entitlementsReady ? (
                <Skeleton className="h-24 w-full" />
              ) : premium ? (
                <WriteMealTab day={day} onLogged={onLogged} />
              ) : (
                <PremiumTeaser body={t("premium.gateWrite")} />
              ),
            },
          ]}
        />
      )}
    </Sheet>
  );
}
