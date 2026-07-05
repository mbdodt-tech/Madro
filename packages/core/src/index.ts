export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./database.types";

export {
  AiError,
  createAiClient,
  aiResultSchemas,
  type AiClient,
  type AiClientOptions,
  type AiTask,
  type AiResult,
} from "./ai";

/**
 * Placeholder for @madro/core — proves workspace linking in Fase 0.1.
 * Real nutrient math, rollups and scoring arrive from Fase 1 onwards.
 */
export function formatGrams(value: number, locale = "da-DK"): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} g`;
}
