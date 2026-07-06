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
import { invalidateDiary } from "./diary/useDiary";
import { ResultSheet } from "./scan/ResultSheet";

type Phase =
  | { kind: "scanning"; cameraError: boolean }
  | { kind: "looking-up"; deep: boolean }
  | { kind: "hit"; food: FoodHit; scanId: string | null }
  | { kind: "miss"; barcode: string; scanId: string | null }
  /** Netværks-/serverfejl — IKKE det samme som et ærligt miss. */
  | { kind: "error"; barcode: string };

export function ScanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { show } = useToast();
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Scanner | null>(null);
  const handledRef = useRef(false);

  const [phase, setPhase] = useState<Phase>({ kind: "scanning", cameraError: false });
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { scanner } = await createScanner();
        if (cancelled) return;
        scannerRef.current = scanner;
        if (videoRef.current) {
          await scanner.start(videoRef.current, (code) => void handleBarcode(code));
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
  }, [handleBarcode]);

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

        {/* Viewfinder */}
        <div className="absolute inset-0 grid place-items-center">
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

        <p className="absolute inset-x-0 bottom-6 text-center text-small text-bg/75">
          {scanning && phase.cameraError ? t("scan.cameraError") : t("scan.hint")}
        </p>
      </div>

      {/* Manuel indtastning — fallback for ridsede koder og enheder uden kamera */}
      <div className="border-t border-bg/10 bg-ink px-5 py-4">
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
      </div>

      {/* Slår op … */}
      <Sheet
        open={phase.kind === "looking-up"}
        onOpenChange={() => undefined}
        title={
          phase.kind === "looking-up" && phase.deep
            ? t("scan.lookingUpDeep")
            : t("scan.lookingUp")
        }
      >
        <div className="space-y-3 py-2" aria-live="polite">
          {phase.kind === "looking-up" && phase.deep ? (
            <p className="text-small text-secondary">{t("scan.lookingUpDeepBody")}</p>
          ) : null}
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </Sheet>

      {/* Hit: fuldt verdikt-ark (1.4) */}
      {phase.kind === "hit" ? (
        <ResultSheet
          food={phase.food}
          scanId={phase.scanId}
          open
          onClose={close}
          onLogged={() => {
            // Sørg for at Dagbog + "I dag" (summary) er friske ved hjemkomst,
            // uanset staleTime.
            invalidateDiary();
            show(t("portion.logged"));
            close();
          }}
        />
      ) : null}

      {/* Fejl (offline/serverfejl) — adskilt fra ærligt miss */}
      <Sheet
        open={phase.kind === "error"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={t("scan.errorTitle")}
        showTitle
      >
        {phase.kind === "error" ? (
          <div className="space-y-4">
            <p className="text-small text-secondary">{t("scan.errorBody")}</p>
            <Button className="w-full" onClick={() => retryLookup(phase.barcode)}>
              {t("common.retry")}
            </Button>
          </div>
        ) : null}
      </Sheet>

      {/* Miss */}
      <Sheet
        open={phase.kind === "miss"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={t("scan.missTitle")}
        showTitle
      >
        {phase.kind === "miss" ? (
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
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
