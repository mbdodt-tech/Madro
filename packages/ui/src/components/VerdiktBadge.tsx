import { cn } from "./cn";
import type { VerdictLevel } from "../tokens";

export interface VerdiktBadgeProps {
  level: VerdictLevel;
  /** Oversat niveau-tekst, fx "Ringe kvalitet" (i18n-nøgle i appen). */
  label: string;
  /** Valgfri score-tekst, fx "38/100". */
  score?: string;
  className?: string;
}

const dotClass: Record<VerdictLevel, string> = {
  excellent: "bg-v-excellent",
  good: "bg-v-good",
  mid: "bg-v-mid",
  poor: "bg-v-poor",
  bad: "bg-v-bad",
};

const textClass: Record<VerdictLevel, string> = {
  excellent: "text-v-excellent",
  good: "text-v-good",
  mid: "text-v-mid",
  poor: "text-v-bad dark:text-v-poor",
  bad: "text-v-bad dark:text-v-poor",
};

const tintClass: Record<VerdictLevel, string> = {
  excellent: "bg-brand-tint",
  good: "bg-brand-tint",
  mid: "bg-v-poor-tint",
  poor: "bg-v-poor-tint",
  bad: "bg-v-poor-tint",
};

export function VerdiktBadge({
  level,
  label,
  score,
  className,
}: VerdiktBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-4 py-2 text-small font-semibold",
        tintClass[level],
        textClass[level],
        className,
      )}
    >
      <span
        className={cn("size-2 rounded-pill", dotClass[level])}
        aria-hidden="true"
      />
      {label}
      {score ? (
        <span className="font-mono font-medium opacity-85">{score}</span>
      ) : null}
    </span>
  );
}
