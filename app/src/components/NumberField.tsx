import { Input } from "@madro/ui";
import { useEffect, useState } from "react";

/** Grænser spejler DB-checkene (migrationer 20260706200000/210000) — ellers afvises skrivningen. */
export const BOUNDS = {
  birth_year: { min: 1900, max: new Date().getFullYear() },
  height_cm: { min: 100, max: 250 },
  weight_kg: { min: 30, max: 300 },
  steps: { min: 0, max: 200000 },
  active_kcal: { min: 0, max: 5000 },
} as const;

export type NumericField = keyof typeof BOUNDS;

/**
 * Talfelt med tekst-spejl (mønster fra PortionForm): gemmer på blur når
 * værdien er gyldig inden for grænserne; ellers rulles feltet tilbage.
 * Delt mellem profilen og forsidens aktivitetskort.
 */
export function NumberField({
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
