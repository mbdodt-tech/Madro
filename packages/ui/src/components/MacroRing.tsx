import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { useCountUp } from "./useCountUp";

const R = 30;
const CIRC = 2 * Math.PI * R; // ≈ 188.5

export type MacroKind = "protein" | "carb" | "fat";

const colorClass: Record<MacroKind, string> = {
  protein: "text-macro-protein",
  carb: "text-macro-carb",
  fat: "text-macro-fat",
};

export interface MacroRingProps {
  macro: MacroKind;
  /** Dagens indtag i gram. */
  value: number;
  /** Mål i gram. */
  target: number;
  /** Oversat label, fx "Protein". */
  label: string;
  className?: string;
}

/**
 * Makroring fra mockuppen. Fyldet cappes ved 100 % — der findes ingen
 * rød "over målet"-tilstand (ansvarlighedsregel: ingen skyld-mekanik).
 */
export function MacroRing({ macro, value, target, label, className }: MacroRingProps) {
  const reduceMotion = useReducedMotion();
  const displayValue = useCountUp(Math.round(value));
  const fraction = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = CIRC * (1 - fraction);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative size-18">
        <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            className="stroke-hairline"
            strokeWidth="7"
          />
          <motion.circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            className={colorClass[macro]}
            initial={reduceMotion ? false : { strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: offset }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-small font-semibold tabular-nums text-ink">
            {displayValue}
          </span>
          <span className="font-mono text-caption tabular-nums text-tertiary">
            /{Math.round(target)} g
          </span>
        </div>
      </div>
      <span className="text-caption text-secondary">{label}</span>
    </div>
  );
}
