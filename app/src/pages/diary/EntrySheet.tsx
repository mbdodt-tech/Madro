import type { NutrientMap } from "@madro/core";
import { Button, Sheet } from "@madro/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PortionForm } from "../../components/PortionForm";
import type { Meal } from "../scan/logMeal";
import { deleteEntry, updateEntry, type DiaryEntry } from "./useDiary";

/**
 * Redigér/slet en dagbogspost: samme PortionForm som scan-flowet,
 * forudfyldt. Sletning kræver et ekstra tryk (neutral tone — ingen
 * skyld-sprog, jf. ansvarlighedsreglerne).
 */
export function EntrySheet({
  entry,
  onClose,
  onChanged,
}: {
  entry: DiaryEntry;
  onClose: () => void;
  onChanged: (kind: "saved" | "removed") => void;
}) {
  const { t } = useTranslation();

  const [grams, setGrams] = useState(Math.round(Number(entry.amount)));
  const [meal, setMeal] = useState<Meal>(entry.meal as Meal);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const nutriments = (entry.foods?.nutriments ?? {}) as NutrientMap;

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      await updateEntry(entry.id, { amountGrams: grams, meal });
      onChanged("saved");
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(false);
    try {
      await deleteEntry(entry.id);
      onChanged("removed");
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={entry.foods?.name ?? t("diary.entry.unknownFood")}
      showTitle
    >
      <div className="space-y-4">
        {entry.foods?.brand ? (
          <p className="-mt-2 text-small text-secondary">{entry.foods.brand}</p>
        ) : null}

        <PortionForm
          grams={grams}
          meal={meal}
          onGrams={setGrams}
          onMeal={setMeal}
          energyKcalPer100={nutriments.energy_kcal ?? null}
        />

        {error ? (
          <p className="rounded-md bg-v-poor-tint px-4 py-3 text-small text-v-bad" role="alert">
            {t("diary.entry.error")}
          </p>
        ) : null}

        <div className="space-y-2">
          <Button className="w-full" onClick={() => void save()} disabled={busy}>
            {t("diary.entry.save")}
          </Button>
          {confirmingDelete ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                {t("diary.entry.keep")}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 text-v-bad"
                onClick={() => void remove()}
                disabled={busy}
              >
                {t("diary.entry.confirmRemove")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
            >
              {t("diary.entry.remove")}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
