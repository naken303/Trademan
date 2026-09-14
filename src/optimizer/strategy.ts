import type { OptimizerStrategyFlags, OptimizerStrategyOptions, OptimizerStrategyPreset, ResolvedOptimizerStrategy } from "./types";

export const OPTIMIZER_STRATEGY_PRESETS: Readonly<Record<Exclude<OptimizerStrategyPreset, "custom">, Readonly<OptimizerStrategyFlags>>> = Object.freeze({
  baseline: Object.freeze({ smartTradeIntelligence: false, smartTravelPruning: false, profitableBuyPruning: false, crateQuantityCandidates: false, sellDominance: false, reachableDemandScoring: false, tradeChainScoring: false }),
  balanced: Object.freeze({ smartTradeIntelligence: true, smartTravelPruning: true, profitableBuyPruning: true, crateQuantityCandidates: true, sellDominance: false, reachableDemandScoring: true, tradeChainScoring: false }),
  optimized: Object.freeze({ smartTradeIntelligence: true, smartTravelPruning: true, profitableBuyPruning: true, crateQuantityCandidates: true, sellDominance: true, reachableDemandScoring: true, tradeChainScoring: true }),
});

const flagNames: (keyof OptimizerStrategyFlags)[] = ["smartTradeIntelligence", "smartTravelPruning", "profitableBuyPruning", "crateQuantityCandidates", "sellDominance", "reachableDemandScoring", "tradeChainScoring"];

/** Resolves one immutable, run-local snapshot. Balanced is the conservative default. */
export function resolveOptimizerStrategy(input: OptimizerStrategyOptions = {}): ResolvedOptimizerStrategy {
  const requested = input.preset ?? "balanced";
  const base = requested === "custom" ? OPTIMIZER_STRATEGY_PRESETS.baseline : OPTIMIZER_STRATEGY_PRESETS[requested];
  const hasOverrides = flagNames.some((name) => input[name] !== undefined && input[name] !== base[name]);
  const flags = Object.fromEntries(flagNames.map((name) => [name, input[name] ?? base[name]])) as unknown as OptimizerStrategyFlags;
  return Object.freeze({ preset: requested === "custom" || hasOverrides ? "custom" : requested, ...flags });
}
