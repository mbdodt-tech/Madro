/**
 * Aktivitetstyper med MET-værdier (2026-07-10, brugerønske): de fleste
 * kan ikke skønne kalorieforbruget for "en halv times løb" — vælg
 * aktivitet + varighed, så regner vi. MET-værdier efter Compendium of
 * Physical Activities (moderat intensitet valgt pr. type). Alt er
 * ESTIMATER og præsenteres sådan — aldrig som krav eller mål
 * (ansvarlighedsregler: ingen point, ingen skyld).
 */

export interface ActivityType {
  id: string;
  labelDa: string;
  labelEn: string;
  /** Metabolisk ækvivalent (kcal pr. kg kropsvægt pr. time). */
  met: number;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  { id: "walk", labelDa: "Gåtur (rask)", labelEn: "Brisk walk", met: 4.3 },
  { id: "run", labelDa: "Løb (~10 km/t)", labelEn: "Running (~10 km/h)", met: 9.8 },
  { id: "bike", labelDa: "Cykling (moderat)", labelEn: "Cycling (moderate)", met: 7.5 },
  { id: "swim", labelDa: "Svømning", labelEn: "Swimming", met: 6.0 },
  { id: "strength", labelDa: "Styrketræning", labelEn: "Strength training", met: 5.0 },
  { id: "hike", labelDa: "Vandretur", labelEn: "Hiking", met: 5.3 },
  { id: "football", labelDa: "Fodbold", labelEn: "Football", met: 7.0 },
  { id: "badminton", labelDa: "Badminton", labelEn: "Badminton", met: 5.5 },
  { id: "dance", labelDa: "Dans", labelEn: "Dancing", met: 5.5 },
  { id: "yoga", labelDa: "Yoga", labelEn: "Yoga", met: 2.5 },
  { id: "garden", labelDa: "Havearbejde", labelEn: "Gardening", met: 3.8 },
  { id: "clean", labelDa: "Rengøring", labelEn: "Housework", met: 3.3 },
];

/** Standardvægt når profilen ikke har en (UI'et opfordrer til at udfylde). */
export const DEFAULT_WEIGHT_KG = 70;

/**
 * Aktiv energi for en aktivitet: MET × kg × timer, afrundet til helt
 * kcal. Ugyldige input → 0 (kalderen viser bare intet estimat).
 */
export function activityKcal(
  met: number,
  weightKg: number,
  minutes: number,
): number {
  if (!Number.isFinite(met) || !Number.isFinite(weightKg) || !Number.isFinite(minutes)) {
    return 0;
  }
  if (met <= 0 || weightKg <= 0 || minutes <= 0) return 0;
  return Math.round((met * weightKg * minutes) / 60);
}
