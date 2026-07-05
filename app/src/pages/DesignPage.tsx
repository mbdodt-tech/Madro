import {
  AppShell,
  BottomTabBar,
  Button,
  Card,
  Chip,
  Input,
  PortionsStepper,
  ScanFab,
  Sheet,
  Skeleton,
  Tabs,
  useTheme,
  useToast,
  VerdiktBadge,
  verdictLevels,
  type ThemeMode,
  type VerdictLevel,
} from "@madro/ui";
import { BarChart3, BookOpen, House, ScanBarcode, User } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * Midlertidig specimen-side for designsystemet (fase-tjekliste 0.2 + 0.3).
 * Alle sektioner vises i lys og mørk side om side; farveværdier
 * aflæses live fra CSS-vars, så siden aldrig indeholder hex selv.
 */

function toHex(rgb: string): string {
  const m = rgb.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\)/);
  if (!m) return rgb;
  const hex = [m[1], m[2], m[3]]
    .map((c) => Number(c).toString(16).padStart(2, "0"))
    .join("");
  const alpha = m[4] !== undefined ? ` · ${Math.round(Number(m[4]) * 100)} %` : "";
  return `#${hex.toUpperCase()}${alpha}`;
}

function Swatch({ name, bgClass }: { name: string; bgClass: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");

  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new MutationObserver(() => {
      if (ref.current)
        setValue(toHex(getComputedStyle(ref.current).backgroundColor));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    setValue(toHex(getComputedStyle(ref.current).backgroundColor));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        className={`h-14 rounded-md border border-hairline ${bgClass}`}
      />
      <div>
        <p className="text-caption font-medium text-ink">{name}</p>
        <p className="font-mono text-caption text-tertiary">{value}</p>
      </div>
    </div>
  );
}

function DualPanel({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-hairline bg-bg p-6">
        {children}
      </div>
      <div className="dark rounded-xl border border-hairline bg-bg p-6">
        {children}
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-h2 text-ink">{title}</h2>
        {note ? <p className="mt-1 text-small text-secondary">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

const paletteEntries: Array<{ name: string; bgClass: string }> = [
  { name: "bg", bgClass: "bg-bg" },
  { name: "surface", bgClass: "bg-surface" },
  { name: "surface-raised", bgClass: "bg-surface-raised" },
  { name: "ink", bgClass: "bg-ink" },
  { name: "secondary", bgClass: "bg-secondary" },
  { name: "tertiary", bgClass: "bg-tertiary" },
  { name: "brand", bgClass: "bg-brand" },
  { name: "brand-hover", bgClass: "bg-brand-hover" },
  { name: "brand-tint", bgClass: "bg-brand-tint" },
  { name: "accent", bgClass: "bg-accent" },
  { name: "hairline", bgClass: "bg-hairline" },
];

const verdictBg: Record<VerdictLevel, string> = {
  excellent: "bg-v-excellent",
  good: "bg-v-good",
  mid: "bg-v-mid",
  poor: "bg-v-poor",
  bad: "bg-v-bad",
};

const typeSpecimenKeys = [
  { key: "display", cls: "text-display" },
  { key: "h1", cls: "text-h1" },
  { key: "h2", cls: "text-h2" },
  { key: "body", cls: "text-body" },
  { key: "small", cls: "text-small" },
  { key: "caption", cls: "text-caption" },
] as const;

const radii = [
  { name: "sm · 10", cls: "rounded-sm" },
  { name: "md · 14", cls: "rounded-md" },
  { name: "lg · 18", cls: "rounded-lg" },
  { name: "xl · 24", cls: "rounded-xl" },
  { name: "pill", cls: "rounded-pill" },
];

const spacingSteps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];

function ThemeSwitch() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const modes: Array<{ value: ThemeMode; label: string }> = [
    { value: "light", label: t("design.theme.light") },
    { value: "dark", label: t("design.theme.dark") },
    { value: "system", label: t("design.theme.system") },
  ];
  return (
    <div
      className="flex gap-0.5 rounded-pill border border-hairline bg-surface p-0.5"
      role="group"
      aria-label={t("design.theme.label")}
    >
      {modes.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setMode(m.value)}
          className={`rounded-pill px-3 py-1 text-small font-medium transition-colors ${
            mode === m.value
              ? "bg-brand text-on-brand"
              : "text-secondary hover:bg-brand-tint hover:text-brand"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Komponent-demoer (kun til galleriet) ---------- */

function StepperDemo() {
  const { t } = useTranslation();
  const [steps, setSteps] = useState(2);
  const grams = steps * 15;
  const kcal = Math.round(steps * 79.5);
  const label =
    steps === 1
      ? t("design.demo.halfHandful")
      : steps === 2
        ? t("design.demo.oneHandful")
        : t("design.demo.handfuls", { count: steps / 2 });
  return (
    <PortionsStepper
      valueLabel={label}
      subLabel={`${grams} g · ${kcal} kcal`}
      onDecrease={() => setSteps((s) => Math.max(1, s - 1))}
      onIncrease={() => setSteps((s) => Math.min(12, s + 1))}
      decreaseLabel={t("design.demo.smallerPortion")}
      increaseLabel={t("design.demo.largerPortion")}
      decreaseDisabled={steps <= 1}
      increaseDisabled={steps >= 12}
    />
  );
}

function ToastDemo() {
  const { t } = useTranslation();
  const { show } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={() => show(t("design.demo.toastMessage"))}
    >
      {t("design.demo.showToast")}
    </Button>
  );
}

function SheetDemo() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button id="sheet-trigger" onClick={() => setOpen(true)}>
        {t("design.demo.openSheet")}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={t("design.demo.scanResult")}>
        <div className="space-y-4">
          <div>
            <h3 className="text-h2 text-ink">{t("design.demo.productName")}</h3>
            <p className="text-small text-secondary">
              {t("design.demo.productBrand")}
            </p>
          </div>
          <VerdiktBadge
            level="poor"
            label={t("design.demo.poorQuality")}
            score="38/100"
          />
          <div className="flex flex-wrap gap-2">
            <Chip>{t("design.demo.novaChip")}</Chip>
            <Chip>{t("design.demo.nutriChip")}</Chip>
            <Chip>{t("design.demo.additivesChip")}</Chip>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => setOpen(false)}>
              {t("design.demo.ateIt")}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("design.demo.showAlternative")}
              <Chip tone="brand">{t("design.demo.comingSoon")}</Chip>
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function AppShellDemo() {
  const { t } = useTranslation();
  const [active, setActive] = useState("today");
  const { show } = useToast();
  const iconCls = "size-5";
  return (
    <div className="h-96 overflow-hidden rounded-xl border border-hairline">
      <AppShell
        bottomBar={
          <BottomTabBar
            navLabel={t("design.demo.navLabel")}
            activeId={active}
            onSelect={setActive}
            items={[
              {
                id: "today",
                label: t("design.demo.tabToday"),
                icon: <House className={iconCls} />,
              },
              {
                id: "diary",
                label: t("design.demo.tabDiary"),
                icon: <BookOpen className={iconCls} />,
              },
              {
                id: "insights",
                label: t("design.demo.tabInsights"),
                icon: <BarChart3 className={iconCls} />,
              },
              {
                id: "profile",
                label: t("design.demo.tabProfile"),
                icon: <User className={iconCls} />,
              },
            ]}
            center={
              <ScanFab
                label={t("design.demo.scanLabel")}
                icon={<ScanBarcode className="size-6" />}
                onClick={() => show(t("design.demo.scanToast"))}
              />
            }
          />
        }
      >
        <div className="space-y-3 p-4">
          <Card>
            <p className="text-small font-medium text-ink">
              {t("design.demo.tabToday")}
            </p>
            <p className="text-caption text-tertiary">
              {t("design.demo.activeTab", { tab: active })}
            </p>
          </Card>
          <Card>
            <Skeleton className="mb-2 h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </Card>
        </div>
      </AppShell>
    </div>
  );
}

export function DesignPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <header className="sticky top-0 z-10 border-b border-hairline bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-h1">{t("design.title")}</h1>
            <p className="text-caption text-tertiary">{t("design.subtitle")}</p>
          </div>
          <ThemeSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <Section
          title={t("design.sections.palette")}
          note={t("design.sections.paletteNote")}
        >
          <DualPanel>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {paletteEntries.map((e) => (
                <Swatch key={e.name} name={e.name} bgClass={e.bgClass} />
              ))}
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.verdict")}
          note={t("design.sections.verdictNote")}
        >
          <DualPanel>
            <div className="flex flex-wrap gap-2">
              {verdictLevels.map((level) => (
                <span
                  key={level}
                  className="inline-flex items-center gap-2 rounded-pill border border-hairline bg-surface px-4 py-2 text-small font-medium text-ink"
                >
                  <span
                    className={`size-2 rounded-pill ${verdictBg[level]}`}
                    aria-hidden="true"
                  />
                  {t(`design.verdictLevels.${level}`)}
                </span>
              ))}
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.macro")}
          note={t("design.sections.macroNote")}
        >
          <DualPanel>
            <div className="grid grid-cols-3 gap-4">
              <Swatch name="protein" bgClass="bg-macro-protein" />
              <Swatch name="kulhydrat" bgClass="bg-macro-carb" />
              <Swatch name="fedt" bgClass="bg-macro-fat" />
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.typography")}
          note={t("design.sections.typographyNote")}
        >
          <DualPanel>
            <div className="space-y-5">
              {typeSpecimenKeys.map((spec) => (
                <div key={spec.key}>
                  <p className="font-mono text-caption text-tertiary">
                    {t(`design.typeSpecimens.${spec.key}`)}
                  </p>
                  <p className={`${spec.cls} text-ink`}>
                    {t("design.specimen")}
                  </p>
                </div>
              ))}
              <div>
                <p className="font-mono text-caption text-tertiary">
                  {t("design.typeSpecimens.mono")}
                </p>
                <div className="mt-1 w-40 font-mono text-body text-ink">
                  <p className="flex justify-between">
                    <span>kcal</span>
                    <span>1.430</span>
                  </p>
                  <p className="flex justify-between">
                    <span>protein</span>
                    <span>61,4</span>
                  </p>
                  <p className="flex justify-between">
                    <span>{t("design.demo.monoIron")}</span>
                    <span>8,2</span>
                  </p>
                </div>
              </div>
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.radius")}
          note={t("design.sections.radiusNote")}
        >
          <DualPanel>
            <div className="space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                {radii.map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <div
                      className={`size-16 border border-hairline bg-brand-tint ${r.cls}`}
                    />
                    <p className="font-mono text-caption text-tertiary">
                      {r.name}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {spacingSteps.map((s) => (
                  <div key={s} className="flex items-center gap-3">
                    <p className="w-8 font-mono text-caption text-tertiary">
                      {s * 4}
                    </p>
                    <div
                      className="h-2 rounded-pill bg-brand"
                      style={{ width: `${s * 4}px` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.depth")}
          note={t("design.sections.depthNote")}
        >
          <DualPanel>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-surface p-4 shadow-1">
                <p className="text-small text-ink">surface + shadow-1</p>
                <p className="text-caption text-tertiary">
                  {t("design.sections.depthCard")}
                </p>
              </div>
              <div className="rounded-lg bg-surface-raised p-4 shadow-sheet">
                <p className="text-small text-ink">surface-raised + sheet</p>
                <p className="text-caption text-tertiary">
                  {t("design.sections.depthSheet")}
                </p>
              </div>
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.buttons")}
          note={t("design.sections.buttonsNote")}
        >
          <DualPanel>
            <div className="flex flex-wrap items-center gap-3">
              <Button>{t("design.demo.ateIt")}</Button>
              <Button variant="secondary">
                {t("design.demo.showAlternative")}
              </Button>
              <Button variant="ghost">{t("design.demo.skip")}</Button>
              <Button disabled>{t("design.demo.disabled")}</Button>
              <Button size="sm">{t("design.demo.small")}</Button>
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.chips")}
          note={t("design.sections.chipsNote")}
        >
          <DualPanel>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Chip>{t("design.demo.novaChip")}</Chip>
                <Chip>{t("design.demo.nutriChip")}</Chip>
                <Chip tone="brand">{t("design.demo.comingSoon")}</Chip>
              </div>
              <div className="flex flex-wrap gap-2">
                {verdictLevels.map((level) => (
                  <VerdiktBadge
                    key={level}
                    level={level}
                    label={t(`design.verdictLevels.${level}`)}
                  />
                ))}
              </div>
              <VerdiktBadge
                level="poor"
                label={t("design.demo.poorQuality")}
                score="38/100"
              />
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.cards")}
          note={t("design.sections.cardsNote")}
        >
          <DualPanel>
            <div className="space-y-4">
              <Card>
                <p className="text-body font-medium text-ink">
                  {t("design.demo.foodName")}
                </p>
                <p className="text-caption text-tertiary">
                  {t("design.demo.foodPortion")}
                </p>
              </Card>
              <Input
                id="demo-search"
                label={t("design.demo.searchLabel")}
                placeholder={t("design.demo.searchPlaceholder")}
                hint={t("design.demo.searchHint")}
              />
              <Card>
                <Skeleton className="mb-2 h-4 w-2/3" />
                <Skeleton className="mb-2 h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </Card>
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.stepper")}
          note={t("design.sections.stepperNote")}
        >
          <DualPanel>
            <div className="space-y-6">
              <StepperDemo />
              <Tabs
                listLabel={t("design.demo.periodLabel")}
                items={[
                  {
                    value: "day",
                    label: t("design.demo.day"),
                    content: (
                      <p className="text-small text-secondary">
                        {t("design.demo.dayContent")}
                      </p>
                    ),
                  },
                  {
                    value: "week",
                    label: t("design.demo.week"),
                    content: (
                      <p className="text-small text-secondary">
                        {t("design.demo.weekContent")}
                      </p>
                    ),
                  },
                  {
                    value: "month",
                    label: t("design.demo.month"),
                    content: (
                      <p className="text-small text-secondary">
                        {t("design.demo.monthContent")}
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </DualPanel>
        </Section>

        <Section
          title={t("design.sections.sheet")}
          note={t("design.sections.sheetNote")}
        >
          <div className="flex flex-wrap gap-3 rounded-xl border border-hairline bg-bg p-6">
            <SheetDemo />
            <ToastDemo />
          </div>
        </Section>

        <Section
          title={t("design.sections.appshell")}
          note={t("design.sections.appshellNote")}
        >
          <DualPanel>
            <AppShellDemo />
          </DualPanel>
        </Section>
      </main>

      <footer className="border-t border-hairline">
        <p className="mx-auto max-w-5xl px-6 py-6 text-caption text-tertiary">
          {t("design.footer")}
        </p>
      </footer>
    </div>
  );
}
