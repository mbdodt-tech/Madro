import { lookupAdditive } from "@madro/core";
import { Chip, Sheet, cn } from "@madro/ui";
import { useTranslation } from "react-i18next";

/**
 * NOVA-uddannelseslaget (2026-07-09): hvad skalaen betyder, hvorfor
 * gruppe 4 er markøren, og hvad E-numre er. Tonen er bevidst neutral —
 * aldrig "farlig"; vi refererer til navngivne systemer (NOVA, EFSA) og
 * lader fakta tale (ansvarlighedsregler + AI-tone-guardrails).
 */
export function NovaInfoSheet({
  open,
  onClose,
  group,
  additives,
}: {
  open: boolean;
  onClose: () => void;
  /** Produktets NOVA-gruppe — fremhæves i listen. */
  group?: number | null;
  /** Produktets tilsætningsstoffer (OFF-koder, fx "en:e330"). */
  additives?: string[];
}) {
  const { t, i18n } = useTranslation();
  const da = i18n.language === "da";

  const named = (additives ?? []).map((code) => lookupAdditive(code));

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={t("nova.title")}
      showTitle
    >
      <div className="space-y-4">
        <p className="text-small text-secondary">{t("nova.intro")}</p>

        <ul className="space-y-2">
          {([1, 2, 3, 4] as const).map((g) => (
            <li
              key={g}
              className={cn(
                "rounded-md border px-3 py-2",
                g === group ? "border-brand" : "border-hairline",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-small font-medium text-ink">
                  {t(`nova.group${g}Title`)}
                </p>
                {g === group ? <Chip>{t("nova.thisProduct")}</Chip> : null}
              </div>
              <p className="mt-0.5 text-small text-secondary">
                {t(`nova.group${g}Body`)}
              </p>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <h3 className="text-body font-semibold text-ink">
            {t("nova.additivesTitle")}
          </h3>
          <p className="text-small text-secondary">{t("nova.additivesBody")}</p>
        </div>

        {named.length > 0 ? (
          <div className="rounded-md border border-hairline bg-bg px-4 py-3">
            <p className="text-caption font-semibold uppercase tracking-widest text-tertiary">
              {t("nova.inThisProduct")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {named.map(({ code, info }) => (
                <li key={code} className="flex items-baseline justify-between gap-3">
                  <span className="text-small text-ink">
                    {info ? (da ? info.nameDa : info.nameEn) : code}
                    {info ? (
                      <span className="text-tertiary">
                        {" "}
                        · {da ? info.categoryDa : info.categoryEn}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-caption text-tertiary">
                    {code}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-caption text-tertiary">{t("nova.sourceNote")}</p>
      </div>
    </Sheet>
  );
}
