import { useState } from "react";
import { cn } from "./cn";

/** Dækningsfarver på panelet (lysende sæt — ens i begge tilstande). */
function coverageClass(pct: number | null): string {
  if (pct == null) return "bg-panel-track";
  if (pct >= 80) return "bg-lume";
  if (pct >= 50) return "bg-panel-mid";
  return "bg-panel-low";
}

export interface MicroStripItem {
  key: string;
  /** Kort label på søjlen, fx "Fe". */
  letter: string;
  /** Fuldt oversat navn til den udfoldede liste, fx "Jern". */
  name: string;
  /** Dækning i % af dagens reference; null = ingen reference. */
  pct: number | null;
}

export interface MicroStripProps {
  items: MicroStripItem[];
  /** Tekst på striben, fx "Mikronæring i dag". */
  hint: string;
  className?: string;
}

/**
 * Mikronæringsstriben på instrumentpanelet: 8 små lysende søjler; tryk
 * folder den fulde liste ud, sorteret efter laveste dækning.
 */
export function MicroStrip({ items, hint, className }: MicroStripProps) {
  const [open, setOpen] = useState(false);

  const sorted = [...items].sort(
    (a, b) => (a.pct ?? Number.POSITIVE_INFINITY) - (b.pct ?? Number.POSITIVE_INFINITY),
  );

  return (
    <div className={cn("border-t border-panel-track pt-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full rounded-lg px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-lume"
      >
        <div className="flex items-end justify-between gap-2" aria-hidden="true">
          {items.map((item) => (
            <div key={item.key} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="relative block h-7 w-1 overflow-hidden rounded-pill bg-panel-track">
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 rounded-pill",
                    coverageClass(item.pct),
                  )}
                  style={{ height: `${Math.min(item.pct ?? 0, 100)}%` }}
                />
              </span>
              <span className="font-mono text-caption font-medium text-panel-dim">
                {item.letter}
              </span>
            </div>
          ))}
        </div>
        <span className="mt-2 flex items-center justify-center gap-1 text-caption font-semibold uppercase tracking-widest text-panel-dim">
          {hint}
          <svg
            viewBox="0 0 24 24"
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open ? (
        <ul className="mt-3 space-y-2.5">
          {sorted.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-small text-panel-ink">
                {item.name}
              </span>
              <span className="relative block h-1 flex-1 overflow-hidden rounded-pill bg-panel-track">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-pill",
                    coverageClass(item.pct),
                  )}
                  style={{ width: `${Math.min(item.pct ?? 0, 100)}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-caption tabular-nums text-panel-dim">
                {item.pct != null ? `${item.pct} %` : "–"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
