import { Button, Chip, MicroStrip, Panel, useToast } from "@madro/ui";
import {
  ArrowLeft,
  Bell,
  Camera,
  CalendarCheck,
  FileDown,
  Lock,
  MessageSquareText,
  Repeat,
  Sparkles,
  Unlock,
  Watch,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import mark from "../assets/omnibite-mark.png";
import { TabShell } from "../components/TabShell";
import { setBetaEntitlement } from "../payments/beta";
import { PREMIUM_PLAN } from "../payments/config";
import { useEntitlements } from "../payments/useEntitlements";

/** Demostriben bag sløret — viser HVAD dybden er, ikke brugerens data. */
const DEMO_MICROS = [
  { key: "d", letter: "D", name: "D-vitamin", pct: 34 },
  { key: "fe", letter: "Fe", name: "Jern", pct: 62 },
  { key: "mg", letter: "Mg", name: "Magnesium", pct: 78 },
  { key: "ca", letter: "Ca", name: "Calcium", pct: 55 },
  { key: "k", letter: "K", name: "Kalium", pct: 47 },
  { key: "b12", letter: "B12", name: "B12-vitamin", pct: 91 },
  { key: "fo", letter: "Fo", name: "Folat", pct: 44 },
  { key: "zn", letter: "Zn", name: "Zink", pct: 68 },
];

function FeatureLine({ icon, children }: { icon: ReactNode; children: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-tint text-brand">
        {icon}
      </span>
      <span className="text-small text-ink">{children}</span>
    </li>
  );
}

/**
 * Paywallen (fase 4.3): konkret værdi frem for pres — et sløret glimt af
 * mikronæringsdybden, ærlig pris/prøvetekst og ALTID en tydelig gratis-vej
 * (gratis-tier forbliver reelt brugbar; ansvarlighedsregler).
 */
export function PremiumPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { premium } = useEntitlements();
  const nf = new Intl.NumberFormat(i18n.language === "da" ? "da-DK" : "en-GB");

  // Beta-prøven: CTA'en aktiverer premium direkte (stub-adapterens kilde);
  // RevenueCat overtager samme knap senere. Fra-knappen gør det nemt at
  // opleve begge tilstande under beta-testen.
  const [busy, setBusy] = useState(false);
  const toggleBeta = async (next: boolean) => {
    setBusy(true);
    try {
      await setBetaEntitlement(next);
      show(t(next ? "premium.activated" : "premium.deactivated"));
    } catch {
      show(t("common.errorBody"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TabShell>
      <div className="page-hero-wash min-h-full">
        <main className="mx-auto flex max-w-md flex-col gap-5 px-6 py-8 font-sans">
          <header className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-widest text-tertiary">
                <img src={mark} alt="" aria-hidden="true" className="size-5 rounded-sm" />
                {t("common.appName")}
              </p>
              <h1 className="text-display text-ink">{t("premium.title")}</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={t("premium.back")}
              className="grid size-10 place-items-center rounded-pill bg-brand-tint text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </button>
          </header>

          {premium ? (
            <>
              <Panel>
                <div className="space-y-2 text-center">
                  <Sparkles className="mx-auto size-6 text-lume" aria-hidden="true" />
                  <p className="text-body font-medium text-panel-ink">
                    {t("premium.alreadyTitle")}
                  </p>
                  <p className="text-small text-panel-dim">{t("premium.alreadyBody")}</p>
                </div>
              </Panel>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => void toggleBeta(false)}
                disabled={busy}
              >
                {t("premium.deactivateBeta")}
              </Button>
            </>
          ) : (
            <>
              {/* Glimtet: den fulde mikrodybde, sløret — værdi, ikke pres */}
              <Panel>
                <div className="relative">
                  <div className="pointer-events-none blur-[6px]" aria-hidden="true">
                    <MicroStrip items={DEMO_MICROS} hint={t("premium.glimpseHint")} />
                  </div>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex items-center gap-2 rounded-pill bg-panel/80 px-4 py-2">
                      <Lock className="size-4 text-lume" aria-hidden="true" />
                      <span className="text-small font-medium text-panel-ink">
                        {t("premium.glimpseLabel")}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>

              <ul className="space-y-3" aria-label={t("premium.featuresLabel")}>
                <FeatureLine icon={<Sparkles className="size-4" aria-hidden="true" />}>
                  {t("premium.featInsights")}
                </FeatureLine>
                <FeatureLine icon={<Camera className="size-4" aria-hidden="true" />}>
                  {t("premium.featPhoto")}
                </FeatureLine>
                <FeatureLine icon={<MessageSquareText className="size-4" aria-hidden="true" />}>
                  {t("premium.featText")}
                </FeatureLine>
                <FeatureLine icon={<Repeat className="size-4" aria-hidden="true" />}>
                  {t("premium.featAlternatives")}
                </FeatureLine>
                <FeatureLine icon={<Watch className="size-4" aria-hidden="true" />}>
                  {t("premium.featWearables")}
                </FeatureLine>
                <FeatureLine icon={<FileDown className="size-4" aria-hidden="true" />}>
                  {t("premium.featExport")}
                </FeatureLine>
              </ul>

              {/* Prøve-tidslinjen (2026-07-09, Mobbin-research): sådan
                  forløber prøven — afdramatiserer tilmeldingen, ærligt. */}
              <ol className="space-y-3" aria-label={t("premium.timelineLabel")}>
                {(
                  [
                    { icon: Unlock, title: t("premium.timelineNowTitle"), body: t("premium.timelineNowBody") },
                    {
                      icon: Bell,
                      title: t("premium.timelineRemindTitle", {
                        day: PREMIUM_PLAN.trialDays - 2,
                      }),
                      body: t("premium.timelineRemindBody"),
                    },
                    {
                      icon: CalendarCheck,
                      title: t("premium.timelineEndTitle", {
                        day: PREMIUM_PLAN.trialDays,
                      }),
                      body: t("premium.timelineEndBody"),
                    },
                  ] as const
                ).map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-tint text-brand">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-small font-medium text-ink">
                        {title}
                      </span>
                      <span className="block text-caption text-secondary">
                        {body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              {/* Prisen som instrumentaflæsning — ærlig prøvetekst */}
              <div className="panel-surface rounded-md px-4 py-4 text-center shadow-panel">
                <p className="font-mono text-h1 tabular-nums text-panel-ink">
                  {nf.format(PREMIUM_PLAN.priceDkkPerYear)} {t("premium.perYear")}
                </p>
                <p className="mt-1 text-caption font-semibold uppercase tracking-widest text-panel-dim">
                  {t("premium.afterTrial", { days: PREMIUM_PLAN.trialDays })}
                </p>
              </div>
              <p className="text-center text-caption text-tertiary">
                {t("premium.trialNote")}
              </p>

              <Button
                className="w-full"
                onClick={() => void toggleBeta(true)}
                disabled={busy}
              >
                {t("premium.cta", { days: PREMIUM_PLAN.trialDays })}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate(-1)}>
                {t("premium.continueFree")}
              </Button>
              <div className="flex justify-center">
                <Chip>{t("premium.freeStays")}</Chip>
              </div>
            </>
          )}
        </main>
      </div>
    </TabShell>
  );
}
