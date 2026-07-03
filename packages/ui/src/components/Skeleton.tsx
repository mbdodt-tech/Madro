import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Pulserende pladsholder; står stille ved prefers-reduced-motion. */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-hairline motion-safe:animate-pulse",
        className,
      )}
      {...rest}
    />
  );
}
