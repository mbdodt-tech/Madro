import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { useCountUp } from "./useCountUp";

const R = 26;
const CIRC = 2 * Math.PI * R;

export type MacroKind = "protein" | "carb" | "fat";

/** Aflæsningsfarver på panelet — lysende, ens i begge tilstande. */
const colorClass: Record<MacroKind, string> = {
  protein: "text-lume",
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
      <div className="relative size-16">
        <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden="true">
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="5.5"
            className="stroke-panel-track"
          />
          <motion.circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="5.5"
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
