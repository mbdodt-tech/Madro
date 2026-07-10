import { cn } from "@madro/ui";

/**
 * Pillegruppe til få gensidigt udelukkende valg (mønster fra PortionForm).
 * Udtrukket fra ProfilePage i 4.1 — deles med onboarding-flowet.
 * layout="row" ("Lysende instrument", 2026-07-10): kompakt formularrække
 * med label til venstre og små piller til højre — profilens strukturgreb.
 */
export function PillGroup({
  label,
  options,
  value,
  onChange,
  layout = "stacked",
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string | null;
  onChange: (id: string) => void;
  layout?: "stacked" | "row";
}) {
  const row = layout === "row";
  const pills = (
    <div className={cn("flex flex-wrap gap-2", row && "justify-end gap-1.5")}>
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
              "rounded-pill font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              row ? "px-3 py-1 text-caption" : "px-4 py-2 text-small",
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
  );

  if (row) {
    return (
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center justify-between gap-3 py-2"
      >
        <span className="shrink-0 text-small text-secondary">{label}</span>
        {pills}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="space-y-1.5">
      <span className="text-small font-medium text-secondary">{label}</span>
      {pills}
    </div>
  );
}
