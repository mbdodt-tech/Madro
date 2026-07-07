import { motion, useReducedMotion } from "motion/react";
import { cn } from "./cn";
import { useCountUp } from "./useCountUp";

/** Målergeometri: halvbue r=84 i 224×118-viewBox med plads til streger. */
const CX = 112;
const CY = 104;
const R = 84;
const ARC_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const ARC_LEN = Math.PI * R;

/** Aflæsningsfarve på panelet (lysende sæt — ens i begge tilstande). */
function arcColorClass(pct: number): string {
  if (pct >= 65) return "text-lume";
  if (pct >= 45) return "text-panel-mid";
  return "text-panel-low";
}

/** Graduerede målestreger — instrumentets kendetegn.
 *  Endepunkterne (0/24) udelades: de ligger på aflæsningens grundlinje
 *  og ville strege labelen igennem. */
function Ticks() {
  const ticks = [];
  for (let i = 1; i <= 23; i++) {
    const angle = Math.PI - (i / 24) * Math.PI;
    const major = i % 6 === 0;
    const r1 = R + 9;
    const r2 = major ? R + 17 : R + 13;
    ticks.push(
      <line
        key={i}
        x1={CX + r1 * Math.cos(angle)}
        y1={CY - r1 * Math.sin(angle)}
        x2={CX + r2 * Math.cos(angle)}
        y2={CY - r2 * Math.sin(angle)}
        strokeWidth={major ? 1.6 : 1}
        className={major ? "stroke-panel-dim" : "stroke-panel-track"}
      />,
    );
  }
  return <g opacity={0.8}>{ticks}</g>;
}

export interface QualityArcProps {
  /** 0-100; null = ingen NOVA-data endnu (tom måler, ingen opfundet andel). */
  pct: number | null;
  /** Tekst under tallet, fx "ikke-ultraforarbejdet". */
  label: string;
  /** Stemningslinje under måleren (aldrig moraliserende — i18n i appen). */
  caption: string;
  className?: string;
}

/** Kvalitetsmåleren — hjertet i instrumentpanelet. Bruges KUN på <Panel>. */
export function QualityArc({ pct, label, caption, className }: QualityArcProps) {
  const reduceMotion = useReducedMotion();
  const displayPct = useCountUp(pct ?? 0);
  const offset = ARC_LEN * (1 - (pct ?? 0) / 100);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-56">
        <svg viewBox="0 0 224 118" className="w-full" aria-hidden="true">
          <Ticks />
          <path
            d={ARC_PATH}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            className="stroke-panel-track"
          />
          {pct != null ? (
            <motion.path
              d={ARC_PATH}
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={ARC_LEN}
              className={cn("glow-reading", arcColorClass(pct))}
              initial={reduceMotion ? false : { strokeDashoffset: ARC_LEN }}
              animate={{ strokeDashoffset: offset }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.2, 0.8, 0.25, 1] }
              }
            />
          ) : (
            /* Standby-lys: måleren er "klar" frem for tom — inviterer i
               stedet for at ligne en fejl (forside-hook 2026-07-07). */
            <motion.circle
              cx={CX - R}
              cy={CY}
              r={4.5}
              fill="currentColor"
              className="glow-reading text-lume"
              initial={false}
              animate={reduceMotion ? { opacity: 0.85 } : { opacity: [0.45, 0.95, 0.45] }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
            />
          )}
        </svg>
        <div className="absolute inset-x-0 -bottom-1 flex flex-col items-center">
          <span className="font-mono text-reading tabular-nums text-panel-ink">
            {pct != null ? (
              <>
                {displayPct}
                <small className="text-h2 text-panel-dim">%</small>
              </>
            ) : (
              "–"
            )}
          </span>
          <span className="mt-1.5 text-caption font-semibold uppercase tracking-widest text-panel-dim">
            {label}
          </span>
        </div>
      </div>
      <p className="mt-3 text-small text-panel-dim">{caption}</p>
    </div>
  );
}
