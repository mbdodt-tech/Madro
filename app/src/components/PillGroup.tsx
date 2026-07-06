import { cn } from "@madro/ui";

/**
 * Pillegruppe til få gensidigt udelukkende valg (mønster fra PortionForm).
 * Udtrukket fra ProfilePage i 4.1 — deles med onboarding-flowet.
 */
export function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      <span className="text-small font-medium text-secondary">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded-pill px-4 py-2 text-small font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                active
                  ? "bg-brand text-on-brand"
                  : "border border-hairline bg-surface text-secondary hover:bg-brand-tint hover:text-brand",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
