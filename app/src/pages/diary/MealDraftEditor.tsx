import {
  AiError,
  PORTION_UNIT_IDS,
  convertToGrams,
  type ParsedMealItem,
  type PortionUnitId,
} from "@madro/core";
import { Button, Chip, Input, cn } from "@madro/ui";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { aiClient } from "../../lib/aiClient";
import { searchFoodsRanked } from "../../scanner/useLookup";
import { defaultMeal, logMeal, MEALS, type Meal } from "../scan/logMeal";
import { buildRows, clampGrams, type DraftRow } from "./mealDraft";
import { isSameDay } from "./useDiary";

/** Rettetrinnets hurtig-knapper: det kameraet (og hukommelsen) ikke ser. */
const QUICK_ADDS: { key: string; query: string; grams: number }[] = [
  { key: "oil", query: "olivenolie", grams: 14 },
  { key: "butter", query: "smør", grams: 10 },
  { key: "dressing", query: "dressing", grams: 30 },
  { key: "sauce", query: "sauce", grams: 50 },
];

/**
 * Delt måltidskladde-editor (2.1 tekst + 2.2 foto): redigerbare rækker
 * (forslag, ikke facit), hurtig-knapper for usynlige ingredienser,
 * fri-tekst-tilføjelse, måltids-chips og "Log alle".
 */
export function MealDraftEditor({
  initialRows,
  day,
  scanId,
  onLogged,
}: {
  initialRows: DraftRow[];
  day: Date;
  /** Sæt ved foto-flowet: scans-rækken markeres 'logged' ved log. */
  scanId?: string | null;
  /** Får de endelige rækker med (3.4: fotoflowet gemmer rettelses-parret). */
  onLogged: (rows: DraftRow[]) => void;
}) {
  const { t, i18n } = useTranslation();

  const [rows, setRows] = useState<DraftRow[]>(initialRows);
  const [meal, setMeal] = useState<Meal>(() => defaultMeal(new Date().getHours()));
  const [extraText, setExtraText] = useState("");
  const [addingExtra, setAddingExtra] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (key: number, changes: Partial<DraftRow>) => {
    setRows((old) => old.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  };

  /** Enhedsskifte (3.3): husholdningsmål → gram via core-tabellen. */
  const changeUnit = (row: DraftRow, unit: PortionUnitId) => {
    if (unit === "g") {
      updateRow(row.key, { unit, gramsText: String(row.grams) });
      return;
    }
    const hint = row.match?.name ?? row.name;
    const grams = clampGrams(convertToGrams(unit, 1, hint) ?? row.grams);
    updateRow(row.key, { unit, countText: "1", grams, gramsText: String(grams) });
  };

  const changeCount = (row: DraftRow, raw: string) => {
    const cleaned = raw.replace(",", ".").replace(/[^\d.]/g, "");
    const parsed = Number(cleaned);
    const hint = row.match?.name ?? row.name;
    const grams = convertToGrams(row.unit, parsed, hint);
    updateRow(row.key, {
      countText: cleaned,
      ...(grams != null
        ? { grams: clampGrams(grams), gramsText: String(clampGrams(grams)) }
        : {}),
    });
  };

  const rowSearch = async (key: number, query: string) => {
    try {
      const hits = await searchFoodsRanked(query);
      updateRow(key, { candidates: hits });
    } catch {
      updateRow(key, { candidates: [] });
    }
  };

  const appendItems = async (items: ParsedMealItem[]) => {
    const newRows = await buildRows(items);
    setRows((old) => [...old, ...newRows]);
  };

  const quickAdd = async (query: string, grams: number) => {
    setError(null);
    await appendItems([{ name: query, grams }]);
  };

  const addByText = async () => {
    const text = extraText.trim();
    if (text.length < 3) return;
    setAddingExtra(true);
    setError(null);
    try {
      const result = await aiClient.callAi("parse_meal", {
        text,
        locale: i18n.language === "da" ? "da" : "en",
      });
      await appendItems(result.items);
      setExtraText("");
    } catch (err) {
      if (err instanceof AiError && err.code === "rate_limited") {
        setError(t("diary.write.rateLimited"));
      } else {
        setError(t("common.errorBody"));
      }
    } finally {
      setAddingExtra(false);
    }
  };

  const allMatched = rows.length > 0 && rows.every((r) => r.match);

  const submit = async () => {
    if (!allMatched) return;
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
          scanId: scanId ?? null,
          consumedAt,
        });
      }
      onLogged(rows);
    } catch {
      setError(t("portion.error"));
      setLogging(false);
    }
  };

  return (
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
                    onClick={() => updateRow(row.key, { searching: !row.searching })}
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
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="flex items-baseline gap-1">
                  <input
                    inputMode="decimal"
                    aria-label={
                      row.unit === "g" ? t("portion.gramsLabel") : t("diary.editor.countLabel")
                    }
                    value={row.unit === "g" ? row.gramsText : row.countText}
                    onChange={(e) => {
                      if (row.unit !== "g") {
                        changeCount(row, e.target.value);
                        return;
                      }
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
                      row.unit === "g"
                        ? updateRow(row.key, { gramsText: String(row.grams) })
                        : undefined
                    }
                    className={cn(
                      "w-12 rounded-md bg-transparent text-right font-mono text-small tabular-nums text-ink",
                      "focus-visible:outline-2 focus-visible:outline-brand",
                    )}
                  />
                  <select
                    aria-label={t("diary.editor.unitLabel")}
                    value={row.unit}
                    onChange={(e) => changeUnit(row, e.target.value as PortionUnitId)}
                    className="rounded-md border-0 bg-transparent font-mono text-small text-secondary focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {PORTION_UNIT_IDS.map((u) => (
                      <option key={u} value={u}>
                        {t(`diary.units.${u}`)}
                      </option>
                    ))}
                  </select>
                </span>
                {row.unit !== "g" ? (
                  <span className="font-mono text-caption tabular-nums text-tertiary">
                    = {row.grams} g
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() =>
                  setRows((old) => old.filter((r) => r.key !== row.key))
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

      {/* Rettetrinnet: usynlige ingredienser (byggeplan §2.3) */}
      <div className="space-y-2">
        <p className="text-caption text-tertiary">{t("diary.editor.invisible")}</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADDS.map((qa) => (
            <button
              key={qa.key}
              type="button"
              onClick={() => void quickAdd(qa.query, qa.grams)}
              className="inline-flex items-center gap-1 rounded-pill border border-hairline bg-surface px-3 py-1.5 text-small font-medium text-secondary transition-colors hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {t(`diary.editor.quick.${qa.key}`)}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              id="editor-extra-text"
              label={t("diary.editor.addByText")}
              placeholder={t("diary.editor.addByTextPlaceholder")}
              value={extraText}
              onChange={(e) => setExtraText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addByText();
              }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void addByText()}
            disabled={addingExtra || extraText.trim().length < 3}
          >
            {addingExtra ? t("diary.write.parsing") : t("diary.editor.add")}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : null}

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
  );
}
