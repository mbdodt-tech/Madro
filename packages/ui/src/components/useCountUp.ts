import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Optælling som i mockuppen (600 ms ease-out). Respekterer
 * prefers-reduced-motion (spring direkte til slutværdien).
 *
 * Korrekthed er frame-uafhængig: selv hvis requestAnimationFrame er sat
 * på pause (skjult fane, baggrundstrottling) lander tallet ALTID på value
 * via en setTimeout-backstop. Den glatte optælling kører oveni via rAF når
 * fanen er synlig. Tidligere lænede vi os udelukkende på motions imperative
 * animate() (frame-drevet), så tallet kunne hænge på den gamle værdi, hvis
 * frames ikke kørte — det var derfor makroringene så ud til at stå stille
 * efter en logning (audit 2026-07-20, BUG-3).
 */
const DURATION_MS = 600;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useCountUp(value: number): number {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  // Seneste viste tal — så en afbrudt animation genoptages blødt derfra.
  const currentRef = useRef(value);

  useEffect(() => {
    const from = currentRef.current;
    if (reduceMotion || from === value) {
      currentRef.current = value;
      setDisplay(value);
      return;
    }

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (start === 0) start = now;
      const t = Math.min(1, (now - start) / DURATION_MS);
      const v = Math.round(from + (value - from) * easeOutCubic(t));
      currentRef.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Backstop: garantér slutværdien uanset om rAF nåede at køre.
    const settle = setTimeout(() => {
      currentRef.current = value;
      setDisplay(value);
    }, DURATION_MS + 50);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [value, reduceMotion]);

  return display;
}
