/**
 * Verdikt-scoren (fase-tjekliste 1.4). Formel v1 — godkendt 2026-07-05,
 * dokumenteret i docs/scoring.md. Læner sig UDELUKKENDE op ad navngivne
 * systemer (Nutri-Score, NOVA, additiv-antal) — ingen egne sundhedsdomme.
 */

/** Identisk literal-union med @madro/ui's VerdictLevel (strukturelt kompatibel). */
export type VerdictLevel = "excellent" | "good" | "mid" | "poor" | "bad";

export interface VerdictInput {
  /** 'a'-'e' eller null/ukendt. */
  nutriscore: string | null | undefined;
  /** 1-4 eller null/ukendt. */
  novaGroup: number | null | undefined;
  /** Antal additiver (fra additives-listen); null = ukendt. */
  additivesCount: number | null | undefined;
}

export interface VerdictComponent {
  key: "nutriscore" | "nova" | "additives";
  /** Delscore 0-100. */
  score: number;
  /** Effektiv vægt efter evt. omvægtning (summer til 1). */
  weight: number;
}

export type VerdictResult =
  | {
      insufficient: false;
      /** 0-100, afrundet til heltal. */
      score: number;
      level: VerdictLevel;
      components: VerdictComponent[];
    }
  | { insufficient: true };

const NUTRI_POINTS: Record<string, number> = { a: 100, b: 80, c: 55, d: 30, e: 10 };
const NOVA_POINTS: Record<number, number> = { 1: 100, 2: 75, 3: 45, 4: 10 };

const WEIGHTS = { nutriscore: 0.5, nova: 0.35, additives: 0.15 } as const;

function additivePoints(count: number): number {
  if (count === 0) return 100;
  if (count <= 2) return 70;
  if (count <= 5) return 40;
  return 10;
}

export function verdictLevelFor(score: number): VerdictLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "mid";
  if (score >= 20) return "poor";
  return "bad";
}

export function computeVerdict(input: VerdictInput): VerdictResult {
  const nutri =
    input.nutriscore != null
      ? NUTRI_POINTS[input.nutriscore.toLowerCase()]
      : undefined;
  const nova =
    input.novaGroup != null ? NOVA_POINTS[input.novaGroup] : undefined;

  // Uden både Nutri-Score og NOVA opfinder vi ikke en score.
  if (nutri === undefined && nova === undefined) {
    return { insufficient: true };
  }

  const additives =
    input.additivesCount != null && input.additivesCount >= 0
      ? additivePoints(input.additivesCount)
      : undefined;

  const present: VerdictComponent[] = [];
  if (nutri !== undefined)
    present.push({ key: "nutriscore", score: nutri, weight: WEIGHTS.nutriscore });
  if (nova !== undefined)
    present.push({ key: "nova", score: nova, weight: WEIGHTS.nova });
  if (additives !== undefined)
    present.push({ key: "additives", score: additives, weight: WEIGHTS.additives });

  // Proportional omvægtning når komponenter mangler.
  const totalWeight = present.reduce((s, c) => s + c.weight, 0);
  const components = present.map((c) => ({ ...c, weight: c.weight / totalWeight }));

  const raw = components.reduce((s, c) => s + c.score * c.weight, 0);
  const score = Math.round(raw);

  return { insufficient: false, score, level: verdictLevelFor(score), components };
}
