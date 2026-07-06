import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "./cn";
import { spring } from "../tokens";

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type={type}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      transition={spring}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "md" && "px-4 py-3 text-body",
        size === "sm" && "px-3 py-2 text-small",
        variant === "primary" &&
          "btn-brand-surface text-on-brand shadow-btn hover:brightness-105",
        variant === "secondary" &&
          "border border-hairline bg-surface font-medium text-ink hover:bg-brand-tint",
        variant === "ghost" &&
          "font-medium text-brand hover:bg-brand-tint",
        className,
      )}
      {...rest}
    />
  );
}
