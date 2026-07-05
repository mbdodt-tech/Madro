import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Optælling som i mockuppen (600 ms ease-out). Respekterer
 * prefers-reduced-motion (spring direkte til slutværdien).
 */
export function useCountUp(value: number): number {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (reduceMotion || from === value) {
      setDisplay(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);

  return display;
}
