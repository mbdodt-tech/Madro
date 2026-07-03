import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "brand";
  /** Valgfrit foranstillet element, fx en verdikt-prik eller et ikon. */
  leading?: ReactNode;
}

export function Chip({
  tone = "neutral",
  leading,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-caption font-medium whitespace-nowrap",
        tone === "neutral" &&
          "border border-hairline bg-surface text-secondary",
        tone === "brand" && "bg-brand-tint text-brand",
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
    </span>
  );
}
