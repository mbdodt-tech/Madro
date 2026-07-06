import {
  AiError,
  finalizeNutrients,
  NUTRIENT_INFO,
  type NutrientKey,
  type NutrientMap,
  type ParsedLabel,
} from "@madro/core";
import { Button, Chip, Input, Skeleton, cn } from "@madro/ui";
import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { aiClient } from "../../lib/aiClient";
import { supabase } from "../../lib/supabase";
import type { FoodHit } from "../../scanner/useLookup";

/** Deklarationens 8 felter i visningsrækkefølge (EU-mærkningens orden). */
const LABEL_FIELDS: NutrientKey[] = [
  "energy_kcal",
  "fat_g",
  "saturated_fat_g",
  "carbohydrate_g",
  "sugars_g",
  "fiber_g",
  "protein_g",
  "salt_g",
];

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

/** Nedskalér i klienten: mindre payload, og originalfotoet forlader aldrig enheden i fuld størrelse. */
async function downscaleToJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return dataUrl.split(",")[1]!;
}

interface Draft {
  name: string;
  brand: string;
  ingredients: string;
  additives: string[];
  novaGroup: number | null;
  /** Felt-tekster (kommategn tilladt under indtastning). */
  fields: Partial<Record<NutrientKey, string>>;
}

function draftFromParsed(parsed: ParsedLabel): Draft {
  const fields: Draft["fields"] = {};
  for (const key of LABEL_FIELDS) {
    const value = parsed.nutriments[key as keyof typeof parsed.nutriments];
    if (value != null) fields[key] = String(value);
  }
  return {
    name: parsed.name ?? "",
    brand: parsed.brand ?? "",
    ingredients: parsed.ingredients_text ?? "",
    additives: parsed.additives,
    novaGroup: parsed.nova_group ?? null,
    fields,
  };
}

/**
 * Miss-arkets tredje vej (fase 2.3): fotografér varedeklarationen →
 * AI-udtræk → REDIGERBAR forhåndsvisning → gem som egen vare med
 * stregkoden. Fotoet persisteres aldrig (nedskaleres, analyseres, smides væk).
 */
export function LabelCaptureStep({
  barcode,
  onBack,
  onSaved,
}: {
  barcode: string;
  onBack: () => void;
  onSaved: (food: FoodHit) => void;
}) {
  const { t, i18n } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const analyze = async (file: File) => {
    setAnalyzing(true);
    setError(null);
    try {
      const image = await downscaleToJpegBase64(file);
      const parsed = await aiClient.callAi("parse_label", {
        image_base64: image,
        media_type: "image/jpeg",
        locale: i18n.language === "da" ? "da" : "en",
      });
      const next = draftFromParsed(parsed);
      const empty =
        !next.name &&
        !next.ingredients &&
        next.additives.length === 0 &&
        Object.keys(next.fields).length === 0;
      if (empty) {
        setError(t("scan.label.nothingFound"));
      } else {
        setDraft(next);
      }
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

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      if (!userId) throw new Error("not_authenticated");

      const map: NutrientMap = {};
      for (const [key, text] of Object.entries(draft.fields)) {
        const value = Number(String(text).replace(",", "."));
        if (Number.isFinite(value) && value >= 0) map[key as NutrientKey] = value;
      }

      const { data, error: insertError } = await supabase
        .from("foods")
        .insert({
          source: "custom",
          data_quality: "user",
          owner_id: userId,
          barcode,
          name: draft.name.trim().slice(0, 200),
          brand: draft.brand.trim().slice(0, 120) || null,
          ingredients_text: draft.ingredients.trim().slice(0, 4000) || null,
          additives: draft.additives.map((a) => `en:${a}`),
          nova_group: draft.novaGroup,
          nutriments: finalizeNutrients(map),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      onSaved(data as FoodHit);
    } catch {
      setError(t("scan.label.saveError"));
      setSaving(false);
    }
  };

  const updateField = (key: NutrientKey, value: string) => {
    setDraft((old) =>
      old ? { ...old, fields: { ...old.fields, [key]: value } } : old,
    );
  };

  const labelKey = i18n.language === "da" ? "labelDa" : "labelEn";

  // ---- Trin 1: tag/vælg foto ----
  if (!draft) {
    return (
      <div className="space-y-4">
        <p className="text-small text-secondary">{t("scan.label.intro")}</p>
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
            <p className="text-small text-tertiary">{t("scan.label.analyzing")}</p>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <Button className="w-full" onClick={() => fileRef.current?.click()}>
            <Camera className="size-4" aria-hidden="true" />
            {t("scan.label.takePhoto")}
          </Button>
        )}
        {error ? (
          <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
            {error}
          </p>
        ) : null}
        <Button variant="ghost" className="w-full" onClick={onBack} disabled={analyzing}>
          {t("scan.label.back")}
        </Button>
      </div>
    );
  }

  // ---- Trin 2: redigerbar forhåndsvisning ----
  return (
    <div className="space-y-4">
      <p className="text-caption text-tertiary">{t("diary.write.estimate")}</p>

      <Input
        id="label-name"
        label={t("scan.label.nameLabel")}
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <Input
        id="label-brand"
        label={t("scan.label.brandLabel")}
        value={draft.brand}
        onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
      />

      {/* NOVA-skøn + additiver */}
      <div className="flex flex-wrap items-center gap-2">
        {draft.novaGroup != null ? (
          <Chip>{t("scan.label.novaEstimate", { group: draft.novaGroup })}</Chip>
        ) : null}
        {draft.additives.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-pill border border-hairline bg-surface px-3 py-1 font-mono text-caption text-secondary"
          >
            {code.toUpperCase()}
            <button
              type="button"
              aria-label={t("scan.label.removeAdditive", { code: code.toUpperCase() })}
              onClick={() =>
                setDraft({
                  ...draft,
                  additives: draft.additives.filter((a) => a !== code),
                })
              }
              className="grid size-4 place-items-center rounded-pill text-tertiary hover:text-v-bad"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>

      {/* Deklarationsfelterne pr. 100 g */}
      <div className="overflow-hidden rounded-lg border border-hairline">
        <p className="border-b border-hairline bg-bg px-4 py-2 text-caption text-tertiary">
          {t("scan.label.per100")}
        </p>
        <ul className="divide-y divide-hairline">
          {LABEL_FIELDS.map((key) => (
            <li key={key} className="flex items-center justify-between gap-3 bg-surface px-4 py-2">
              <span className="text-small text-ink">{NUTRIENT_INFO[key][labelKey]}</span>
              <span className="flex items-baseline gap-1">
                <input
                  inputMode="decimal"
                  aria-label={NUTRIENT_INFO[key][labelKey]}
                  value={draft.fields[key] ?? ""}
                  placeholder="–"
                  onChange={(e) =>
                    updateField(key, e.target.value.replace(/[^\d,.]/g, ""))
                  }
                  className={cn(
                    "w-16 rounded-md bg-transparent text-right font-mono text-small tabular-nums text-ink",
                    "focus-visible:outline-2 focus-visible:outline-brand",
                  )}
                />
                <span className="w-8 font-mono text-caption text-tertiary">
                  {NUTRIENT_INFO[key].unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : null}

      <Button
        className="w-full"
        onClick={() => void save()}
        disabled={saving || !draft.name.trim()}
      >
        {t("scan.label.save")}
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => setDraft(null)} disabled={saving}>
        {t("scan.label.retake")}
      </Button>
    </div>
  );
}
