import { Button, Chip, Input, Sheet, Skeleton, useToast } from "@madro/ui";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createScanner, type Scanner } from "../scanner/scanner";
import {
  lookupBarcode,
  lookupViaOff,
  recordScan,
  searchFoods,
  type FoodHit,
} from "../scanner/useLookup";
import { PremiumTeaser } from "../payments/PremiumTeaser";
import { useEntitlements } from "../payments/useEntitlements";
import { invalidateDiary } from "./diary/useDiary";
import { LabelCaptureStep } from "./scan/LabelCaptureStep";
import { PhotoMealSheet } from "./scan/PhotoMealSheet";
import { ResultView } from "./scan/ResultSheet";

type Phase =
  | { kind: "scanning"; cameraError: boolean }
  | { kind: "looking-up"; deep: boolean }
  | { kind: "hit"; food: FoodHit; scanId: string | null }
  | { kind: "miss"; barcode: string; scanId: string | null }
  /** Fotografér varedeklarationen (fase 2.3) — opretter egen vare. */
  | { kind: "label"; barcode: string; scanId: string | null }
  /** Måltidsfoto (fase 2.2) — retter uden stregkode. */
  | { kind: "photo" }
  /** Netværks-/serverfejl — IKKE det samme som et ærligt miss. */
  | { kind: "error"; barcode: string };

export function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const { premium, ready: entitlementsReady } = useEntitlements();
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const handledRef = useRef(false);

  const [phase, setPhase] = useState<Phase>({ kind: "scanning", cameraError: false });
  // Kamera-tilladelsens tre tilstande (BUG-2, regression 2026-07-21). Mens
  // den er "prompt", står browserens native tilladelsesdialog åben og stjæler
  // tastaturfokus — så fallback-feltet er dødt, og "Kameraet er utilgængeligt"
  // ville være faktuelt forkert. Vi beder i stedet brugeren besvare/afvise
  // forespørgslen. "unknown" = browser uden camera-permission-API (Safari/FF):
  // uændret adfærd.
  const [camState, setCamState] = useState<PermissionState | "unknown">("unknown");
  const [manualCode, setManualCode] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodHit[] | null>(null);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (handledRef.current) return;
    handledRef.current = true;
    scannerRef.current?.stop();
    setPhase({ kind: "looking-up", deep: false });
    try {
      let food = await lookupBarcode(barcode);
      if (!food) {
        // Cache-miss → éngangs-fallback mod OFF (server-side, cacher varen).
        setPhase({ kind: "looking-up", deep: true });
        food = await lookupViaOff(barcode);
      }
      const scanId = await recordScan(barcode, food?.id ?? null);
      setPhase(
        food
          ? { kind: "hit", food, scanId }
          : { kind: "miss", barcode, scanId },
      );
    } catch {
      // Kunne ikke slå op (offline/serverfejl) — vis fejl, ikke miss.
      setPhase({ kind: "error", barcode });
    }
  }, []);

  const retryLookup = (barcode: string) => {
    handledRef.current = false;
    void handleBarcode(barcode);
  };

  // Native (5.2): MLKit's scanner-UI tager over — knappen genåbner den.
  const [nativeScanOnce, setNativeScanOnce] = useState<
    (() => Promise<string | null>) | null
  >(null);
  const runNativeScan = useCallback(
    async (scanOnce: () => Promise<string | null>) => {
      try {
        const code = await scanOnce();
        if (code) void handleBarcode(code);
      } catch {
        setPhase((p) =>
          p.kind === "scanning" ? { kind: "scanning", cameraError: true } : p,
        );
      }
    },
    [handleBarcode],
  );

  // Overvåg kamera-tilladelsen, så beskeden matcher den faktiske tilstand.
  useEffect(() => {
    let cancelled = false;
    let status: PermissionStatus | null = null;
    const onChange = () => {
      if (status) setCamState(status.state);
    };
    (async () => {
      try {
        // "camera" er endnu ikke i PermissionName-typen, men understøttes i Chromium.
        status = await navigator.permissions.query({
          name: "camera" as PermissionName,
        });
        if (cancelled) return;
        setCamState(status.state);
        status.addEventListener("change", onChange);
      } catch {
        if (!cancelled) setCamState("unknown");
      }
    })();
    return () => {
      cancelled = true;
      status?.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const setup = await createScanner();
        if (cancelled) return;
        if (setup.mode === "native") {
          setNativeScanOnce(() => setup.scanOnce);
          void runNativeScan(setup.scanOnce);
          return;
        }
        scannerRef.current = setup.scanner;
        if (videoRef.current) {
          await setup.scanner.start(videoRef.current, (code) => void handleBarcode(code));
        }
      } catch {
        if (!cancelled) {
          setPhase((p) =>
            p.kind === "scanning" ? { kind: "scanning", cameraError: true } : p,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop();
    };
  }, [handleBarcode, runNativeScan]);

  // Sekvensnummer dropper forsinkede svar fra ældre søgninger (stale-race).
  const searchSeq = useRef(0);
  const runSearch = async (value: string) => {
    setQuery(value);
    const seq = ++searchSeq.current;
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    try {
      const hits = await searchFoods(value);
      if (seq === searchSeq.current) setResults(hits);
    } catch {
      if (seq === searchSeq.current) setResults([]);
    }
  };

  const close = () => navigate("/", { replace: true });

  const scanning = phase.kind === "scanning";

  // ÉT fælles Sheet for hele scan-resultatet (audit 2026-07-20, BUG-1):
  // tidligere havde hver fase sit eget modale Sheet, og et fase-skift lod
  // to Radix-dialoger overlappe under exit-animationen — det efterlod
  // document.body med pointer-events: none, så "Jeg spiste det" (og
  // fallback-inputtet, BUG-2) hang. Nu switcher vi ét Sheet's børn, præcis
  // som det manuelle "Tilføj måltid"-flow (AddFoodSheet). Titel + synlighed
  // afhænger af fasen.
  const sheetHeader: { title: string; show: boolean } =
    phase.kind === "looking-up"
      ? {
          title: phase.deep ? t("scan.lookingUpDeep") : t("scan.lookingUp"),
          show: false,
        }
      : phase.kind === "hit"
        ? { title: t("verdict.sheetTitle"), show: false }
        : phase.kind === "miss"
          ? { title: t("scan.missTitle"), show: true }
          : phase.kind === "error"
            ? { title: t("scan.errorTitle"), show: true }
            : phase.kind === "label"
              ? { title: t("scan.label.title"), show: true }
              : phase.kind === "photo"
                ? { title: t("scan.photo.title"), show: true }
                : { title: "", show: false };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink font-sans">
      {/* Kamera */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 size-full object-cover"
          muted
          playsInline
        />
        <button
          type="button"
          onClick={close}
          aria-label={t("scan.close")}
          className="absolute right-4 top-5 z-10 grid size-10 place-items-center rounded-pill text-bg hover:bg-bg/10 focus-visible:outline-2 focus-visible:outline-bg"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Native tilstand: MLKit-UI'et er lukket igen — genåbn med knappen */}
        {nativeScanOnce ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <Button onClick={() => void runNativeScan(nativeScanOnce)}>
              {t("scan.openNative")}
            </Button>
          </div>
        ) : null}

        {/* Viewfinder — rent dekorativt (aria-hidden): må ALDRIG opsnappe
            pointer-events, så et fejlramt tryk nær inputtet ikke lander på
            en død overlay-flade (audit 2026-07-20, BUG-2-hærdning). */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative h-44 w-72">
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <span
                key={corner}
                aria-hidden="true"
                className={`absolute size-7 border-brand ${
                  corner === "tl"
                    ? "left-0 top-0 rounded-tl-md border-l-3 border-t-3"
                    : corner === "tr"
                      ? "right-0 top-0 rounded-tr-md border-r-3 border-t-3"
                      : corner === "bl"
                        ? "bottom-0 left-0 rounded-bl-md border-b-3 border-l-3"
                        : "bottom-0 right-0 rounded-br-md border-b-3 border-r-3"
                }`}
              />
            ))}
            {scanning && !phase.cameraError && !reduceMotion ? (
              <motion.div
                aria-hidden="true"
                className="absolute inset-x-3 top-3 h-0.5 rounded-pill bg-brand shadow-fab"
                animate={{ y: [0, 148, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </div>
        </div>

        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-small text-bg/75">
          {camState === "prompt"
            ? t("scan.cameraPrompt")
            : scanning && phase.cameraError
              ? t("scan.cameraError")
              : t("scan.hint")}
        </p>
      </div>

      {/* Manuel indtastning — fallback for ridsede koder og enheder uden kamera */}
      <div className="space-y-3 border-t border-bg/10 bg-ink px-5 py-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const code = manualCode.trim();
            if (/^\d{4,14}$/.test(code)) void handleBarcode(code);
          }}
        >
          <div className="flex-1 [&_input]:bg-bg/10 [&_input]:text-bg [&_label]:text-bg/70">
            <Input
              id="manual-barcode"
              inputMode="numeric"
              label={t("scan.manualLabel")}
              placeholder={t("scan.manualPlaceholder")}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            {t("scan.manualSubmit")}
          </Button>
        </form>

        {/* Anden indfangningsvej (2.2): måltid uden stregkode */}
        <button
          type="button"
          onClick={() => {
            handledRef.current = true;
            scannerRef.current?.stop();
            setPhase({ kind: "photo" });
          }}
          className="w-full text-center text-small font-medium text-bg/80 underline-offset-4 hover:text-bg hover:underline focus-visible:outline-2 focus-visible:outline-bg"
        >
          {t("scan.photo.openButton")}
        </button>
      </div>

      {/* ÉT Sheet for alle scan-faser — se kommentaren ved sheetHeader.
          Ingen to modale dialoger overlapper længere ved fase-skift. */}
      <Sheet
        open={!scanning}
        onOpenChange={(open) => {
          if (open) return;
          // Under selve opslaget kan arket ikke afvises (uændret adfærd).
          if (phase.kind === "looking-up") return;
          close();
        }}
        title={sheetHeader.title}
        showTitle={sheetHeader.show}
      >
        {phase.kind === "looking-up" ? (
          <div className="space-y-3 py-2" aria-live="polite">
            {phase.deep ? (
              <p className="text-small text-secondary">{t("scan.lookingUpDeepBody")}</p>
            ) : null}
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : phase.kind === "hit" ? (
          <ResultView
            food={phase.food}
            scanId={phase.scanId}
            onSwapFood={(alternative) =>
              setPhase({ kind: "hit", food: alternative, scanId: phase.scanId })
            }
            onLogged={() => {
              // Sørg for at Dagbog + "I dag" (summary) er friske ved
              // hjemkomst, uanset staleTime.
              invalidateDiary();
              show(t("portion.logged"));
              close();
            }}
          />
        ) : phase.kind === "photo" ? (
          // Fotologning er premium (gating-beslutning 2026-07-09) — de
          // dyre AI-kald bor bag paywallen, gratis-scanning røres ikke.
          !entitlementsReady ? (
            <Skeleton className="h-24 w-full" />
          ) : premium ? (
            <PhotoMealSheet
              onLogged={() => {
                invalidateDiary();
                show(t("portion.logged"));
                close();
              }}
            />
          ) : (
            <PremiumTeaser body={t("premium.gatePhoto")} />
          )
        ) : phase.kind === "error" ? (
          <div className="space-y-4">
            <p className="text-small text-secondary">{t("scan.errorBody")}</p>
            <Button className="w-full" onClick={() => retryLookup(phase.barcode)}>
              {t("common.retry")}
            </Button>
          </div>
        ) : phase.kind === "miss" ? (
          <div className="space-y-4">
            <p className="text-small text-secondary">
              {t("scan.missBody", { barcode: phase.barcode })}
            </p>
            <Input
              id="miss-search"
              label={t("scan.searchLabel")}
              placeholder={t("scan.searchPlaceholder")}
              value={query}
              onChange={(e) => void runSearch(e.target.value)}
            />
            {results !== null ? (
              results.length > 0 ? (
                <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                  {results.map((food) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setPhase((p) =>
                            p.kind === "miss"
                              ? { kind: "hit", food, scanId: p.scanId }
                              : p,
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-body text-ink">
                            {food.name}
                          </span>
                          {food.brand ? (
                            <span className="block truncate text-caption text-tertiary">
                              {food.brand}
                            </span>
                          ) : null}
                        </span>
                        <Chip>{t(`scan.source.${food.source}`)}</Chip>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small text-tertiary">{t("scan.noResults")}</p>
              )
            ) : null}

            {/* Tredje vej (2.3): fotografér varedeklarationen */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                setPhase((p) =>
                  p.kind === "miss"
                    ? { kind: "label", barcode: p.barcode, scanId: p.scanId }
                    : p,
                )
              }
            >
              {t("scan.label.openButton")}
            </Button>
          </div>
        ) : phase.kind === "label" ? (
          <LabelCaptureStep
            barcode={phase.barcode}
            onBack={() =>
              setPhase({ kind: "miss", barcode: phase.barcode, scanId: phase.scanId })
            }
            onSaved={(food) => setPhase({ kind: "hit", food, scanId: phase.scanId })}
          />
        ) : null}
      </Sheet>
    </div>
  );
}
