import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "md" | "lg";
}

/**
 * Instrumentpanelet — Madros signaturflade ("Instrumentet", 2026-07-06):
 * dyb evergreen i BEGGE tilstande, med kant-lys foroven og svag lume-dis.
 * Aflæsninger på panelet bruger panel-ink/panel-dim og lume-farverne.
 */
export function Panel({ padding = "md", className, ...rest }: PanelProps) {
  return (
    <div
      className={cn(
        "panel-surface rounded-xl text-panel-ink shadow-panel",
        padding === "md" && "p-5",
        padding === "lg" && "p-6",
        className,
      )}
      {...rest}
    />
  );
}
