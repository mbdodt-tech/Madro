import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Synligt label — påkrævet for tilgængelighed. */
  label: string;
  id: string;
  hint?: string;
}

export function Input({ label, id, hint, className, ...rest }: InputProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={cn(
          "rounded-md border border-hairline bg-surface px-4 py-3 text-body text-ink",
          "placeholder:text-tertiary",
          "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-brand",
          className,
        )}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="text-caption text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
