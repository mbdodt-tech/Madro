import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { useCountUp } from "./useCountUp";

/** Mockup-geometrien: halvbue r=84 i 200×110-viewBox. */
const ARC_PATH = "M 16 104 A 84 84 0 0 1 184 104";
const ARC_LEN = 264;

/** Farvetærskler fra mockuppen (andel ikke-ultraforarbejdet). */
function arcColorClass(pct: number): string {
  if (pct >= 85) return "text-v-excellent";
  if (pct >= 65) return "text-v-good";
  if (pct >= 45) return "text-v-mid";
  if (pct >= 25) return "text-v-poor";
  return "text-v-bad";
}

export interface QualityArcProps {
  /** 0-100; null = ingen NOVA-data endnu (tom bue, ingen opfundet andel). */
  pct: number | null;
  /** Tekst under tallet, fx "ikke-ultraforarbejdet". */
  label: string;
  /** Stemningslinje under buen (aldrig moraliserende — i18n i appen). */
  caption: string;
  className?: string;
}

export function QualityArc({ pct, label, caption, className }: QualityArcProps) {
  const reduceMotion = useReducedMotion();
  const displayPct = useCountUp(pct ?? 0);
  const offset = ARC_LEN * (1 - (pct ?? 0) / 100);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-52">
        <svg viewBox="0 0 200 110" className="w-full" aria-hidden="true">
          <path
            d={ARC_PATH}
            fill="none"
            className="stroke-hairline"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {pct != null ? (
            <motion.path
              d={ARC_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              className={arcColorClass(pct)}
              initial={reduceMotion ? false : { strokeDashoffset: ARC_LEN }}
              animate={{ strokeDashoffset: offset }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }
              }
            />
          ) : null}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="font-mono text-display tabular-nums text-ink">
            {pct != null ? (
              <>
                {displayPct}
                <small className="text-h2">%</small>
              </>
            ) : (
              "–"
            )}
          </span>
          <span className="text-caption text-secondary">{label}</span>
        </div>
      </div>
      <p className="mt-2 text-small text-tertiary">{caption}</p>
    </div>
  );
}
