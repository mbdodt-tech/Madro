import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { useCountUp } from "./useCountUp";

// Større geometri (telefonfeedback 2026-07-06): tallene indeni må
// aldrig røre ringen — indre diameter skal rumme "/263 g" i caption-mono.
const R = 30;
const CIRC = 2 * Math.PI * R;

export type MacroKind = "protein" | "carb" | "fat";

/** Aflæsningsfarver på panelet — koral/rav/skifer ("Lysende instrument"). */
const colorClass: Record<MacroKind, string> = {
  protein: "text-panel-protein",
  carb: "text-panel-carb",
  fat: "text-panel-fat",
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
 * Makroring på instrumentpanelet. Fyldet cappes ved 100 % — der findes
 * ingen rød "over målet"-tilstand (ansvarlighedsregel: ingen skyld-mekanik).
 */
export function MacroRing({ macro, value, target, label, className }: MacroRingProps) {
  const reduceMotion = useReducedMotion();
  const displayValue = useCountUp(Math.round(value));
  const fraction = target > 0 ? Math.min(value / target, 1) : 0;
  const offset = CIRC * (1 - fraction);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative size-19">
        <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            strokeWidth="5"
            className="stroke-panel-track"
          />
          <motion.circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            className={cn("glow-reading", colorClass[macro])}
            initial={reduceMotion ? false : { strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: offset }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.2, 0.8, 0.25, 1] }
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-small font-medium tabular-nums text-panel-ink">
            {displayValue}
          </span>
          <span className="font-mono text-caption tabular-nums text-panel-dim">
            /{Math.round(target)} g
          </span>
        </div>
      </div>
      <span className="text-caption font-semibold uppercase tracking-widest text-panel-dim">
        {label}
      </span>
    </div>
  );
}
