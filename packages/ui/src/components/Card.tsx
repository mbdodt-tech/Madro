import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** none = kortet styrer selv sin padding via children. */
  padding?: "none" | "md" | "lg";
  raised?: boolean;
}

export function Card({
  padding = "md",
  raised = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-hairline shadow-1",
        raised ? "bg-surface-raised" : "bg-surface",
        padding === "md" && "p-4",
        padding === "lg" && "p-6",
        className,
      )}
      {...rest}
    />
  );
}
