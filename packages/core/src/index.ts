export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

/**
 * Placeholder for @madro/core — proves workspace linking in Fase 0.1.
 * Real nutrient math, rollups and scoring arrive from Fase 1 onwards.
 */
export function formatGrams(value: number, locale = "da-DK"): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} g`;
}
