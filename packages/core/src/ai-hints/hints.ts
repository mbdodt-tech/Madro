/**
 * Foto-forfining ud fra brugerrettelser (fase 3.4).
 *
 * Aggregerer brugerens EGNE tidligere fotorettelser ({ai_items, final_items}
 * fra scans.payload — kun navne/gram, aldrig billeder) til få, kompakte
 * kalibrerings-hints til parse_photo_meal. Ren funktion; kræver mindst
 * MIN_PAIRS rettelses-par, før der siges noget (ellers overtilpasser vi
 * på tilfældigheder). Hints er sætninger til modellen — aldrig UI-tekst.
 */

export interface CorrectionItem {
  name: string;
  grams: number;
}

export interface CorrectionPair {
  ai_items: CorrectionItem[];
  final_items: CorrectionItem[];
}

/** Færre par end dette → ingen hints (ingen læring på 1-2 målinger). */
const MIN_PAIRS = 3;
/** Portions-bias skal afvige mindst så meget fra 1, før den nævnes. */
const BIAS_THRESHOLD = 0.15;
const MAX_HINTS = 4;

const norm = (name: string) => name.trim().toLowerCase();

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Byg kalibrerings-hints af de seneste rettelses-par (nyeste først er fint —
 * rækkefølgen er ligegyldig for aggregaterne).
 */
export function buildCorrectionHints(
  pairs: CorrectionPair[],
  locale: "da" | "en" = "da",
): string[] {
  if (pairs.length < MIN_PAIRS) return [];
  const da = locale === "da";
  const hints: string[] = [];

  // 1) Portions-bias: median af final/ai for navne-matchede poster.
  const ratios: number[] = [];
  for (const pair of pairs) {
    const finalByName = new Map(pair.final_items.map((i) => [norm(i.name), i.grams]));
    for (const item of pair.ai_items) {
      const finalGrams = finalByName.get(norm(item.name));
      if (finalGrams != null && item.grams > 0 && finalGrams > 0) {
        ratios.push(finalGrams / item.grams);
      }
    }
  }
  if (ratios.length >= MIN_PAIRS) {
    const m = median(ratios);
    if (m <= 1 - BIAS_THRESHOLD) {
      const pct = Math.round((1 - m) * 100);
      hints.push(
        da
          ? `Brugeren nedjusterer typisk portionsstørrelser med ca. ${pct} % — estimér lidt mindre.`
          : `The user typically adjusts portion sizes down by about ${pct}% — estimate slightly smaller.`,
      );
    } else if (m >= 1 + BIAS_THRESHOLD) {
      const pct = Math.round((m - 1) * 100);
      hints.push(
        da
          ? `Brugeren opjusterer typisk portionsstørrelser med ca. ${pct} % — estimér lidt større.`
          : `The user typically adjusts portion sizes up by about ${pct}% — estimate slightly larger.`,
      );
    }
  }

  // 2) Ofte tilføjede/fjernede poster (i mindst ⅓ af parrene, min. 2).
  const threshold = Math.max(2, Math.ceil(pairs.length / 3));
  const countNames = (extract: (p: CorrectionPair) => string[]): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const pair of pairs) {
      for (const name of new Set(extract(pair))) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return counts;
  };

  const added = countNames((p) => {
    const aiNames = new Set(p.ai_items.map((i) => norm(i.name)));
    return p.final_items.map((i) => norm(i.name)).filter((n) => !aiNames.has(n));
  });
  const frequentAdded = [...added.entries()]
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => n);
  if (frequentAdded.length > 0) {
    const list = frequentAdded.join(", ");
    hints.push(
      da
        ? `Brugeren tilføjer ofte selv: ${list}. Medtag dem, når retten sandsynliggør det.`
        : `The user often adds: ${list}. Include them when the dish makes it likely.`,
    );
  }

  const removed = countNames((p) => {
    const finalNames = new Set(p.final_items.map((i) => norm(i.name)));
    return p.ai_items.map((i) => norm(i.name)).filter((n) => !finalNames.has(n));
  });
  const frequentRemoved = [...removed.entries()]
    .filter(([, c]) => c >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n]) => n);
  if (frequentRemoved.length > 0) {
    const list = frequentRemoved.join(", ");
    hints.push(
      da
        ? `Brugeren fjerner ofte: ${list}. Medtag dem kun, når de tydeligt kan ses.`
        : `The user often removes: ${list}. Only include them when clearly visible.`,
    );
  }

  return hints.slice(0, MAX_HINTS);
}
