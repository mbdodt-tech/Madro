import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { spring } from "../tokens";

export interface PortionsStepperProps {
  /** Primær værdi — tekst ("1 håndfuld") eller et redigerbart felt. */
  valueLabel: ReactNode;
  /** Sekundær linje, fx "30 g · 159 kcal". */
  subLabel?: ReactNode;
  onDecrease: () => void;
  onIncrease: () => void;
  /** Oversatte aria-labels til knapperne. */
  decreaseLabel: string;
  increaseLabel: string;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  className?: string;
}

function StepButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      transition={spring}
      className={cn(
        "grid size-12 flex-none place-items-center rounded-pill border border-hairline bg-surface text-brand",
        "hover:bg-brand-tint transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </motion.button>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PortionsStepper({
  valueLabel,
  subLabel,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  decreaseDisabled,
  increaseDisabled,
  className,
}: PortionsStepperProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-hairline bg-bg p-4",
        className,
      )}
    >
      <StepButton
        onClick={onDecrease}
        label={decreaseLabel}
        disabled={decreaseDisabled}
      >
        <MinusIcon />
      </StepButton>
      <div
        className="flex flex-col items-center gap-0.5"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-mono text-h2 font-semibold text-ink">
          {valueLabel}
        </span>
        {subLabel ? (
          <span className="font-mono text-small text-secondary">
            {subLabel}
          </span>
        ) : null}
      </div>
      <StepButton
        onClick={onIncrease}
        label={increaseLabel}
        disabled={increaseDisabled}
      >
        <PlusIcon />
      </StepButton>
    </div>
  );
}
