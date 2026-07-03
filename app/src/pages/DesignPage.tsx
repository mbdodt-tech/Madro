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
} from "@madro/ui";
import {
  BarChart3,
  BookOpen,
  House,
  ScanBarcode,
  User,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Midlertidig specimen-side for designsystemet (fase-tjekliste 0.2).
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

const verdictLabels: Record<(typeof verdictLevels)[number], string> = {
  excellent: "Fremragende",
  good: "God",
  mid: "Middel",
  poor: "Ringe",
  bad: "Meget ringe",
};

const verdictBg: Record<(typeof verdictLevels)[number], string> = {
  excellent: "bg-v-excellent",
  good: "bg-v-good",
  mid: "bg-v-mid",
  poor: "bg-v-poor",
  bad: "bg-v-bad",
};

const typeSpecimens = [
  { label: "Display · 32/40/600", cls: "text-display" },
  { label: "H1 · 24/32/600", cls: "text-h1" },
  { label: "H2 · 20/28/600", cls: "text-h2" },
  { label: "Body · 16/24/400", cls: "text-body" },
  { label: "Small · 14/20/400", cls: "text-small" },
  { label: "Caption · 12/16/500", cls: "text-caption" },
];

const radii = [
  { name: "sm · 10", cls: "rounded-sm" },
  { name: "md · 14", cls: "rounded-md" },
  { name: "lg · 18", cls: "rounded-lg" },
  { name: "xl · 24", cls: "rounded-xl" },
  { name: "pill", cls: "rounded-pill" },
];

const spacingSteps = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];

function ThemeSwitch() {
  const { mode, setMode } = useTheme();
  const modes: Array<{ value: ThemeMode; label: string }> = [
    { value: "light", label: "Lys" },
    { value: "dark", label: "Mørk" },
    { value: "system", label: "System" },
  ];
  return (
    <div
      className="flex gap-0.5 rounded-pill border border-hairline bg-surface p-0.5"
      role="group"
      aria-label="Farvetilstand"
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
  const [steps, setSteps] = useState(2);
  const grams = steps * 15;
  const kcal = Math.round(steps * 79.5);
  const label =
    steps === 1 ? "½ håndfuld" : steps === 2 ? "1 håndfuld" : `${steps / 2} håndfulde`;
  return (
    <PortionsStepper
      valueLabel={label}
      subLabel={`${grams} g · ${kcal} kcal`}
      onDecrease={() => setSteps((s) => Math.max(1, s - 1))}
      onIncrease={() => setSteps((s) => Math.min(12, s + 1))}
      decreaseLabel="Mindre portion"
      increaseLabel="Større portion"
      decreaseDisabled={steps <= 1}
      increaseDisabled={steps >= 12}
    />
  );
}

function ToastDemo() {
  const { show } = useToast();
  return (
    <Button variant="secondary" onClick={() => show("Logget under snacks")}>
      Vis toast
    </Button>
  );
}

function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button id="sheet-trigger" onClick={() => setOpen(true)}>
        Åbn resultat-ark
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Scanresultat">
        <div className="space-y-4">
          <div>
            <h3 className="text-h2 text-ink">Snackchips sour cream &amp; onion</h3>
            <p className="text-small text-secondary">Kims · 165 g</p>
          </div>
          <VerdiktBadge level="poor" label="Ringe kvalitet" score="38/100" />
          <div className="flex flex-wrap gap-2">
            <Chip>NOVA 4 · ultraforarbejdet</Chip>
            <Chip>Nutri-Score D</Chip>
            <Chip>3 additiver</Chip>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => setOpen(false)}>Jeg spiste det</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Vis bedre alternativ
              <Chip tone="brand">kommer snart</Chip>
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function AppShellDemo() {
  const [active, setActive] = useState("today");
  const { show } = useToast();
  const iconCls = "size-5";
  return (
    <div className="h-96 overflow-hidden rounded-xl border border-hairline">
      <AppShell
        bottomBar={
          <BottomTabBar
            navLabel="Hovednavigation"
            activeId={active}
            onSelect={setActive}
            items={[
              { id: "today", label: "I dag", icon: <House className={iconCls} /> },
              { id: "diary", label: "Dagbog", icon: <BookOpen className={iconCls} /> },
              { id: "insights", label: "Indsigt", icon: <BarChart3 className={iconCls} /> },
              { id: "profile", label: "Profil", icon: <User className={iconCls} /> },
            ]}
            center={
              <ScanFab
                label="Scan stregkode eller måltid"
                icon={<ScanBarcode className="size-6" />}
                onClick={() => show("Scan-flowet kommer i Fase 1")}
              />
            }
          />
        }
      >
        <div className="space-y-3 p-4">
          <Card>
            <p className="text-small font-medium text-ink">I dag</p>
            <p className="text-caption text-tertiary">
              aktiv fane: {active}
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
  return (
    <div className="min-h-screen bg-bg font-sans text-ink">
      <header className="sticky top-0 z-10 border-b border-hairline bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-h1">Madro designsystem</h1>
            <p className="text-caption text-tertiary">
              byggeplan §3 · tokens er eneste kilde til styling
            </p>
          </div>
          <ThemeSwitch />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-12">
        <Section
          title="Palet"
          note="Semantiske farver — samme utility, automatisk lys/mørk. Hex-værdierne aflæses live fra CSS-variablerne."
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
          title="Verdikt-skala"
          note="Afdæmpet kvalitetsskala — aldrig alarmerende, ingen skyld."
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
                  {verdictLabels[level]}
                </span>
              ))}
            </div>
          </DualPanel>
        </Section>

        <Section
          title="Makro-farver"
          note="Protein, kulhydrat og fedt — godkendt i designoplægget."
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
          title="Typografi"
          note="Geist Sans til UI, Geist Mono med tabular-nums til alle tal."
        >
          <DualPanel>
            <div className="space-y-5">
              {typeSpecimens.map((t) => (
                <div key={t.label}>
                  <p className="font-mono text-caption text-tertiary">
                    {t.label}
                  </p>
                  <p className={`${t.cls} text-ink`}>
                    Forstå kvaliteten af det, du spiser
                  </p>
                </div>
              ))}
              <div>
                <p className="font-mono text-caption text-tertiary">
                  Geist Mono · tabular-nums
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
                    <span>jern</span>
                    <span>8,2</span>
                  </p>
                </div>
              </div>
            </div>
          </DualPanel>
        </Section>

        <Section
          title="Radius & spacing"
          note="Radius 10/14/18/24/pill · 4-pt spacing-grid."
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
          title="Dybde"
          note="Lys: subtile lagdelte skygger. Mørk: fladelyshed og hårlinjer i stedet for skygge."
        >
          <DualPanel>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-surface p-4 shadow-1">
                <p className="text-small text-ink">surface + shadow-1</p>
                <p className="text-caption text-tertiary">kort</p>
              </div>
              <div className="rounded-lg bg-surface-raised p-4 shadow-sheet">
                <p className="text-small text-ink">surface-raised + sheet</p>
                <p className="text-caption text-tertiary">ark</p>
              </div>
            </div>
          </DualPanel>
        </Section>
        <Section
          title="Knapper"
          note="Primær, sekundær og ghost — spring ved tryk, ingen skalering ved reduceret bevægelse."
        >
          <DualPanel>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Jeg spiste det</Button>
              <Button variant="secondary">Vis alternativ</Button>
              <Button variant="ghost">Spring over</Button>
              <Button disabled>Deaktiveret</Button>
              <Button size="sm">Lille</Button>
            </div>
          </DualPanel>
        </Section>

        <Section
          title="Chips & verdikt"
          note="Neutral chip, brand-chip og VerdiktBadge i alle fem niveauer."
        >
          <DualPanel>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Chip>NOVA 4 · ultraforarbejdet</Chip>
                <Chip>Nutri-Score D</Chip>
                <Chip tone="brand">kommer snart</Chip>
              </div>
              <div className="flex flex-wrap gap-2">
                {verdictLevels.map((level) => (
                  <VerdiktBadge
                    key={level}
                    level={level}
                    label={verdictLabels[level]}
                  />
                ))}
              </div>
              <VerdiktBadge level="poor" label="Ringe kvalitet" score="38/100" />
            </div>
          </DualPanel>
        </Section>

        <Section
          title="Kort, input & skeleton"
          note="Card på surface med shadow-1 · Input med synligt label · pulserende Skeleton."
        >
          <DualPanel>
            <div className="space-y-4">
              <Card>
                <p className="text-body font-medium text-ink">
                  Havregryn med mælk og banan
                </p>
                <p className="text-caption text-tertiary">1 portion · 260 g</p>
              </Card>
              <Input
                id="demo-search"
                label="Søg fødevare"
                placeholder="fx havregryn"
                hint="Søger på tværs af USDA, Frida og Open Food Facts"
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
          title="Portionsvælger & faner"
          note="Stepper med aria-live på værdien · Radix Tabs med piletast-navigation."
        >
          <DualPanel>
            <div className="space-y-6">
              <StepperDemo />
              <Tabs
                listLabel="Periode"
                items={[
                  {
                    value: "day",
                    label: "Dag",
                    content: (
                      <p className="text-small text-secondary">
                        Dagens overblik vises her.
                      </p>
                    ),
                  },
                  {
                    value: "week",
                    label: "Uge",
                    content: (
                      <p className="text-small text-secondary">
                        Ugens tendenser vises her.
                      </p>
                    ),
                  },
                  {
                    value: "month",
                    label: "Måned",
                    content: (
                      <p className="text-small text-secondary">
                        Månedens tendenser vises her.
                      </p>
                    ),
                  },
                ]}
              />
            </div>
          </DualPanel>
        </Section>

        <Section
          title="Ark & toast"
          note="Bund-ark med spring-fysik (Radix Dialog: Esc lukker, fokus fanges) · toast over fanebjælken. Begge følger sidens aktive tema — brug kontakten øverst."
        >
          <div className="flex flex-wrap gap-3 rounded-xl border border-hairline bg-bg p-6">
            <SheetDemo />
            <ToastDemo />
          </div>
        </Section>

        <Section
          title="App-skal"
          note="BottomTabBar med central hævet ScanFAB — rammen her er galleriets telefon-preview."
        >
          <DualPanel>
            <AppShellDemo />
          </DualPanel>
        </Section>
      </main>

      <footer className="border-t border-hairline">
        <p className="mx-auto max-w-5xl px-6 py-6 text-caption text-tertiary">
          Midlertidig side — fjernes når komponentgalleriet (0.3) tager over.
        </p>
      </footer>
    </div>
  );
}
