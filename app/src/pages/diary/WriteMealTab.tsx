import { AiError } from "@madro/core";
import { Button, Input } from "@madro/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { aiClient } from "../../lib/aiClient";
import { MealDraftEditor } from "./MealDraftEditor";
import { buildRows, type DraftRow } from "./mealDraft";

/**
 * "Skriv"-fanen (fase 2.1): fri tekst → AI-forslag → den delte
 * kladde-editor (redigerbare rækker, rettetrin, log alle).
 */
export function WriteMealTab({
  day,
  onLogged,
}: {
  day: Date;
  onLogged: () => void;
}) {
  const { t, i18n } = useTranslation();

  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [parseCount, setParseCount] = useState(0);

  const parse = async () => {
    setParsing(true);
    setError(null);
    setRows(null);
    try {
      const result = await aiClient.callAi("parse_meal", {
        text: text.trim(),
        locale: i18n.language === "da" ? "da" : "en",
      });
      setRows(await buildRows(result.items));
      setParseCount((n) => n + 1);
    } catch (err) {
      if (err instanceof AiError && err.code === "missing_anthropic_key") {
        setError(t("diary.write.aiNotConfigured"));
      } else if (err instanceof AiError && err.code === "rate_limited") {
        setError(t("diary.write.rateLimited"));
      } else {
        setError(t("common.errorBody"));
      }
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        id="write-meal"
        label={t("diary.write.label")}
        placeholder={t("diary.write.placeholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim().length >= 3) void parse();
        }}
      />
      <Button
        className="w-full"
        onClick={() => void parse()}
        disabled={parsing || text.trim().length < 3}
      >
        {parsing ? t("diary.write.parsing") : t("diary.write.parse")}
      </Button>

      {error ? (
        <p role="alert" className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad">
          {error}
        </p>
      ) : null}

      {rows != null ? (
        // key nulstiller editorens interne tilstand ved ny fortolkning.
        <MealDraftEditor
          key={parseCount}
          initialRows={rows}
          day={day}
          onLogged={onLogged}
        />
      ) : null}
    </div>
  );
}
