import { AiError, type ParsedMealItem } from "@madro/core";
import { Button, Chip, Input, cn } from "@madro/ui";
import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { aiClient } from "../../lib/aiClient";
import { searchFoodsRanked, type FoodHit } from "../../scanner/useLookup";
import { defaultMeal, logMeal, MEALS, type Meal } from "../scan/logMeal";
import { isSameDay } from "./useDiary";

interface Row {
  key: number;
  name: string;
  note?: string;
  grams: number;
  gramsText: string;
  match: FoodHit | null;
  /** Række-lokal søgning når brugeren vil skifte match. */
  searching: boolean;
  candidates: FoodHit[];
}

function clampGrams(value: number): number {
  return Math.min(2000, Math.max(1, Math.round(value)));
}

/**
 * Vælg bedste kandidat til et parset navn. ilike-søgningen matcher
 * substrings midt i ord ("ost" → "T-ost-ada shells"), så rangér:
 * eksakt navn > starter med > helt ord > øvrige (søgeordenen bevares
 * som tie-breaker: verified før crowdsourced).
 */
function pickBestMatch(name: string, candidates: FoodHit[]): FoodHit | null {
  const q = name.trim().toLowerCase();
  const wordRe = new RegExp(`(^|[^\\p{L}])${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "iu");
  const score = (food: FoodHit): number => {
    const n = food.name.toLowerCase();
    if (n === q) return 0;
    // "ost, fast, 40+" slår "ostrich …": prefiks efterfulgt af skilletegn.
    if (n.startsWith(q) && !/\p{L}/u.test(n.charAt(q.length))) return 1;
    if (n.startsWith(q)) return 2;
    if (wordRe.test(food.name)) return 3;
    return 4;
  };
  return [...candidates]
    .map((food, index) => ({ food, index, s: score(food) }))
    .sort((a, b) => a.s - b.s || a.index - b.index)[0]?.food ?? null;
}

/**
 * "Skriv"-fanen (fase 2.1): fri tekst → AI-forslag som REDIGERBARE rækker
 * (byggeplanens princip: forslag, ikke låst facit) → ét tryk logger alle.
 */
export function WriteMealTab({
  day,
  onLogged,
}: {
  day: Date;
  onLogged: () => void;
}) {
  const { t, i18n } = useTranslation();

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal(new Date().getHours()));
  const [logging, setLogging] = useState(false);

  const parse = async () => {
    setParsing(true);
    setError(null);
    setRows(null);
    try {
      const result = await aiClient.callAi("parse_meal", {
        text: text.trim(),
        locale: i18n.language === "da" ? "da" : "en",
      });
      // Match hvert forslag mod vores foods (bedste hit; kan skiftes pr. række).
      const matched = await Promise.all(
        result.items.map(async (item: ParsedMealItem, index: number) => {
          let candidates: FoodHit[] = [];
          try {
            candidates = await searchFoodsRanked(item.name);
          } catch {
            candidates = [];
          }
          return {
            key: index,
            name: item.name,
            note: item.note,
            grams: clampGrams(item.grams),
            gramsText: String(clampGrams(item.grams)),
            match: pickBestMatch(item.name, candidates),
            searching: false,
            candidates,
          } satisfies Row;
        }),
      );
      setRows(matched);
    } catch (err) {
      if (err instanceof AiError && err.code === "missing_anthropic_key") {
        setError(t("diary.write.aiNotConfigured"));
      } else if (err instanceof AiError && err.code === "rate_limited") {
        setError(t("diary.write.rateLimited"));
      } else {
        setError(t("common.errorBody"));
      }
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (key: number, changes: Partial<Row>) => {
    setRows((old) =>
      old ? old.map((r) => (r.key === key ? { ...r, ...changes } : r)) : old,
    );
  };

  const rowSearch = async (key: number, query: string) => {
    try {
      const hits = await searchFoodsRanked(query);
      updateRow(key, { candidates: hits });
    } catch {
      updateRow(key, { candidates: [] });
    }
  };

  const readyRows = rows?.filter((r) => r.match) ?? [];
  const allMatched = rows != null && rows.length > 0 && readyRows.length === rows.length;

  const submit = async () => {
    if (!rows || !allMatched) return;
    setLogging(true);
    setError(null);
    try {
      const consumedAt = isSameDay(day, new Date())
        ? undefined
        : new Date(new Date(day).setHours(12, 0, 0, 0));
      for (const row of rows) {
        await logMeal({
          foodId: row.match!.id,
          amountGrams: row.grams,
          meal,
          scanId: null,
          consumedAt,
        });
      }
      onLogged();
    } catch {
      setError(t("portion.error"));
      setLogging(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        id="write-meal"
        label={t("diary.write.label")}
        placeholder={t("diary.write.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim().length >= 3) void parse();
        }}
      />
      <Button
        className="w-full"
        onClick={() => void parse()}
        disabled={parsing || text.trim().length < 3}
      >
        {parsing ? t("diary.write.parsing") : t("diary.write.parse")}
      </Button>

      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : null}

      {rows != null ? (
        <div className="space-y-3">
          <p className="text-caption text-tertiary">{t("diary.write.estimate")}</p>

          <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
            {rows.map((row) => (
              <li key={row.key} className="space-y-2 bg-surface px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-ink first-letter:uppercase">
                      {row.name}
                      {row.note ? (
                        <span className="text-caption text-tertiary"> · {row.note}</span>
                      ) : null}
                    </span>
                    {row.match ? (
                      <button
                        type="button"
                        onClick={() =>
                          updateRow(row.key, { searching: !row.searching })
                        }
                        className="block max-w-full truncate text-caption text-brand hover:text-brand-hover"
                      >
                        {row.match.name} · {t(`scan.source.${row.match.source}`)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateRow(row.key, { searching: true })}
                        className="block text-caption font-medium text-v-bad"
                      >
                        {t("diary.write.chooseFood")}
                      </button>
                    )}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1">
                    <input
                      inputMode="numeric"
                      aria-label={t("portion.gramsLabel")}
                      value={row.gramsText}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        const parsed = Number(raw);
                        updateRow(row.key, {
                          gramsText: raw,
                          ...(Number.isFinite(parsed) && parsed > 0
                            ? { grams: clampGrams(parsed) }
                            : {}),
                        });
                      }}
                      onBlur={() =>
                        updateRow(row.key, { gramsText: String(row.grams) })
                      }
                      className={cn(
                        "w-12 rounded-md bg-transparent text-right font-mono text-small tabular-nums text-ink",
                        "focus-visible:outline-2 focus-visible:outline-brand",
                      )}
                    />
                    <span className="font-mono text-small text-secondary">g</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRows((old) => old?.filter((r) => r.key !== row.key) ?? null)
                    }
                    aria-label={t("diary.write.removeRow", { name: row.name })}
                    className="grid size-8 shrink-0 place-items-center rounded-pill text-tertiary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>

                {row.searching ? (
                  <div className="space-y-2">
                    <Input
                      id={`row-search-${row.key}`}
                      label={t("scan.searchLabel")}
                      placeholder={t("scan.searchPlaceholder")}
                      defaultValue={row.name}
                      onChange={(e) => void rowSearch(row.key, e.target.value)}
                    />
                    <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                      {row.candidates.slice(0, 5).map((food) => (
                        <li key={food.id}>
                          <button
                            type="button"
                            onClick={() =>
                              updateRow(row.key, { match: food, searching: false })
                            }
                            className="flex w-full items-center justify-between gap-3 bg-bg px-3 py-2 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-small text-ink">
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
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2" role="group" aria-label={t("portion.mealLabel")}>
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMeal(m)}
                className={cn(
                  "rounded-pill px-4 py-2 text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  meal === m
                    ? "bg-brand text-on-brand"
                    : "border border-hairline bg-surface text-secondary hover:bg-brand-tint hover:text-brand",
                )}
              >
                {t(`portion.meal.${m}`)}
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => void submit()}
            disabled={logging || !allMatched}
          >
            {t("diary.write.logAll", { count: rows.length })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
