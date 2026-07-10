import { Input } from "@madro/ui";
import { useEffect, useState } from "react";

/** Grænser spejler DB-checkene (migrationer 20260706200000/210000) — ellers afvises skrivningen. */
export const BOUNDS = {
  birth_year: { min: 1900, max: new Date().getFullYear() },
  height_cm: { min: 100, max: 250 },
  weight_kg: { min: 30, max: 300 },
  steps: { min: 0, max: 200000 },
  active_kcal: { min: 0, max: 5000 },
  /** Manuelt dagligt kalorietal (goals.kcal). Gulvet på 1200 er en
   *  ansvarligheds-grænse — lavere mål viser vi ikke, punktum. */
  kcal_goal: { min: 1200, max: 6000 },
} as const;

export type NumericField = keyof typeof BOUNDS;

/**
 * Talfelt med tekst-spejl (mønster fra PortionForm): gemmer på blur når
 * værdien er gyldig inden for grænserne; ellers rulles feltet tilbage.
 * Delt mellem profilen og forsidens aktivitetskort.
 * layout="row" ("Lysende instrument", 2026-07-10): kompakt formularrække —
 * label venstre, mono-værdi højre; hele profilen på én skærmhøjde.
 */
export function NumberField({
  id,
  field,
  label,
  value,
  onSave,
  layout = "stacked",
}: {
  id: string;
  field: NumericField;
  label: string;
  value: number | null;
  onSave: (field: NumericField, value: number) => void;
  layout?: "stacked" | "row";
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
        field === "birth_year" || field === "steps" || field === "kcal_goal"
          ? Math.round(parsed)
          : Math.round(parsed * 10) / 10;
      if (rounded !== value) onSave(field, rounded);
    } else {
      setText(value == null ? "" : String(value));
    }
  };

  if (layout === "row") {
    return (
      <label
        htmlFor={id}
        className="flex items-center justify-between gap-3 py-2"
      >
        <span className="text-small text-secondary">{label}</span>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          placeholder="–"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="w-24 rounded-sm bg-transparent text-right font-mono text-body font-medium tabular-nums text-ink placeholder:text-tertiary focus-visible:outline-2 focus-visible:outline-brand"
        />
      </label>
    );
  }

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
