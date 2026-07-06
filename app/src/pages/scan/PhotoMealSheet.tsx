import { AiError, type CorrectionItem } from "@madro/core";
import { Button, Skeleton } from "@madro/ui";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { aiClient } from "../../lib/aiClient";
import { downscaleToJpegBase64 } from "../../lib/image";
import { recordScan } from "../../scanner/useLookup";
import { MealDraftEditor } from "../diary/MealDraftEditor";
import { buildRows, type DraftRow } from "../diary/mealDraft";
import { fetchCorrectionHints, saveCorrectionPair } from "./corrections";

/**
 * Måltidsfoto (fase 2.2): foto af tallerkenen → AI-genkendte retter som
 * redigerbare rækker i den delte editor (rettetrin: usynlige ingredienser).
 * Fotoet persisteres aldrig. scans-rækken (type photo) følger
 * checked→logged-modellen.
 */
export function PhotoMealSheet({ onLogged }: { onLogged: () => void }) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [aiItems, setAiItems] = useState<CorrectionItem[]>([]);

  const analyze = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const locale = i18n.language === "da" ? ("da" as const) : ("en" as const);
      // Kalibrerings-hints fra brugerens egne tidligere rettelser (3.4) —
      // ren bonus; tom liste for nye brugere, og fejl blokerer aldrig.
      const hints = await fetchCorrectionHints(locale);
      const image = await downscaleToJpegBase64(file);
      const result = await aiClient.callAi("parse_photo_meal", {
        image_base64: image,
        media_type: "image/jpeg",
        locale,
        ...(hints.length > 0 ? { hints } : {}),
      });
      if (result.items.length === 0) {
        setError(t("scan.photo.nothingFound"));
        return;
      }
      const id = await recordScan(null, null, "photo");
      setScanId(id);
      setAiItems(result.items.map(({ name, grams }) => ({ name, grams })));
      setRows(await buildRows(result.items));
    } catch (err) {
      if (err instanceof AiError && err.code === "missing_anthropic_key") {
        setError(t("diary.write.aiNotConfigured"));
      } else if (err instanceof AiError && err.code === "rate_limited") {
        setError(t("diary.write.rateLimited"));
      } else {
        setError(t("common.errorBody"));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  if (rows != null) {
    return (
      <MealDraftEditor
        initialRows={rows}
        day={new Date()}
        scanId={scanId}
        onLogged={(finalRows) => {
          // Rettelses-parret gemmes fire-and-forget (aldrig blokerende).
          if (scanId) {
            void saveCorrectionPair(
              scanId,
              aiItems,
              finalRows.map((r) => ({ name: r.name, grams: r.grams })),
            );
          }
          onLogged();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-small text-secondary">{t("scan.photo.intro")}</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void analyze(file);
          e.target.value = "";
        }}
      />
      {analyzing ? (
        <div className="space-y-3" aria-live="polite">
          <p className="text-small text-tertiary">{t("scan.photo.analyzing")}</p>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : (
        <Button className="w-full" onClick={() => fileRef.current?.click()}>
          <Camera className="size-4" aria-hidden="true" />
          {t("scan.photo.takePhoto")}
        </Button>
      )}
      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
