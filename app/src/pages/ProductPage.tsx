import {
  computeVerdict,
  NUTRIENT_INFO,
  NUTRIENT_KEYS,
  type NutrientMap,
  type Tables,
} from "@madro/core";
import { Card, Chip, Skeleton, VerdiktBadge } from "@madro/ui";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatAdditive } from "./scan/format";
import { useProfile } from "../auth/useProfile";

type Food = Tables<"foods">;

export function ProductPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const hideCalories = profile?.hide_calories ?? false;

  const [food, setFood] = useState<Food | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    void supabase
      .from("foods")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setFood((data as Food | null) ?? null));
  }, [id]);

  if (food === undefined) {
    return (
      <main className="mx-auto max-w-md space-y-4 px-6 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </main>
    );
  }
  if (food === null) {
    return (
      <main className="mx-auto max-w-md px-6 py-10">
        <p className="text-body text-secondary">{t("product.notFound")}</p>
      </main>
    );
  }

  const nutriments = (food.nutriments ?? {}) as NutrientMap;
  const additives = (food.additives ?? []) as string[];
  const verdict = computeVerdict({
    nutriscore: food.nutriscore,
    novaGroup: food.nova_group,
    additivesCount: additives.length,
  });
  const labelKey = i18n.language === "da" ? "labelDa" : "labelEn";

  const rows = NUTRIENT_KEYS.filter((key) => nutriments[key] != null).filter(
    (key) => !(hideCalories && key === "energy_kcal"),
  );

  return (
    <div className="min-h-screen bg-bg font-sans">
      <main className="mx-auto max-w-md space-y-5 px-6 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t("product.back")}
          className="grid size-10 place-items-center rounded-pill text-secondary hover:bg-brand-tint hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          {food.image_url ? (
            <motion.img
              layoutId={`food-image-${food.id}`}
              src={food.image_url}
              alt=""
              className="size-20 flex-none rounded-lg border border-hairline object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <motion.h1 layoutId={`food-name-${food.id}`} className="text-h1 text-ink">
              {food.name}
            </motion.h1>
            {food.brand ? (
              <p className="text-small text-secondary">{food.brand}</p>
            ) : null}
          </div>
        </div>

        {verdict.insufficient ? (
          <Chip>{t("verdict.insufficient")}</Chip>
        ) : (
          <VerdiktBadge
            level={verdict.level}
            label={t(`verdict.level.${verdict.level}`)}
            score={`${verdict.score}/100`}
          />
        )}

        {!verdict.insufficient ? (
          <Card>
            <h2 className="mb-3 text-small font-semibold text-secondary">
              {t("product.whyHeading")}
            </h2>
            <ul className="space-y-2 text-small text-ink">
              {food.nova_group != null ? (
                <li>
                  {t("product.whyNova", { group: food.nova_group })}
                  {food.nova_group === 4 ? ` (${t("verdict.ultraProcessed")})` : ""}
                </li>
              ) : null}
              {food.nutriscore ? (
                <li>{t("product.whyNutri", { grade: food.nutriscore.toUpperCase() })}</li>
              ) : null}
              <li>{t("product.whyAdditives", { count: additives.length })}</li>
            </ul>
          </Card>
        ) : null}

        {food.ingredients_text ? (
          <Card>
            <h2 className="mb-2 text-small font-semibold text-secondary">
              {t("product.ingredients")}
            </h2>
            <p className="text-small text-ink">{food.ingredients_text}</p>
          </Card>
        ) : null}

        {additives.length > 0 ? (
          <Card>
            <h2 className="mb-2 text-small font-semibold text-secondary">
              {t("product.additives")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {additives.map((tag) => (
                <Chip key={tag}>{formatAdditive(tag)}</Chip>
              ))}
            </div>
          </Card>
        ) : null}

        {rows.length > 0 ? (
          <Card>
            <h2 className="mb-3 text-small font-semibold text-secondary">
              {t("product.nutritionHeading")}
            </h2>
            <table className="w-full font-mono text-small">
              <tbody>
                {rows.map((key) => (
                  <tr key={key} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-2 font-sans text-secondary">
                      {NUTRIENT_INFO[key][labelKey]}
                    </td>
                    <td className="py-2 text-right text-ink">
                      {nutriments[key]!.toLocaleString(i18n.language === "da" ? "da-DK" : "en-US", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      {NUTRIENT_INFO[key].unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-caption text-tertiary">{t("verdict.per100g")}</p>
          </Card>
        ) : null}

        <p className="text-caption text-tertiary">
          {t(`product.attribution.${food.source}`)}
        </p>
      </main>
    </div>
  );
}
