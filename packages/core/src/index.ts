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
  parsedMealItemSchema,
  parsedLabelSchema,
  type ParsedMealItem,
  type ParsedLabel,
  type AiClient,
  type AiClientOptions,
  type AiTask,
  type AiResult,
} from "./ai";

export * from "./nutrients";

export {
  sumNutrients,
  novaShare,
  resolveTargets,
  micronutrientCoverage,
  MICRO_STRIP_KEYS,
  type RollupEntry,
  type NovaShare,
  type MacroTargets,
  type MicroCoverage,
} from "./rollup/rollup";

export {
  computeVerdict,
  verdictLevelFor,
  type VerdictInput,
  type VerdictResult,
  type VerdictComponent,
  type VerdictLevel as CoreVerdictLevel,
} from "./verdict/verdict";

/**
 * Placeholder for @madro/core — proves workspace linking in Fase 0.1.
 * Real nutrient math, rollups and scoring arrive from Fase 1 onwards.
 */
export function formatGrams(value: number, locale = "da-DK"): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} g`;
}
