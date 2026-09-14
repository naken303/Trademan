import type { Duration, SimulationState, WorldData } from "../shared/types";

export interface OptimizerInput {
  world: WorldData;
  periodDays: number;
  beamWidth?: number;
  maxSteps?: number;
  maxExpandedStates?: number;
  targetProfit?: number;
  strategy?: OptimizerStrategyOptions;
}

export type OptimizerAction =
  | { type: "buy"; productId: string; quantity: number }
  | { type: "sell"; productId: string; quantity: number }
  | { type: "travel"; destinationId: string };

export interface OptimizerPlanStep {
  action: OptimizerAction;
  time: SimulationState["time"];
  villageId: string;
  playerMoney: number;
  accumulatedProfit: number;
}

export interface OptimizerSearchOptions {
  periodDays?: number;
  beamWidth?: number;
  maxSteps?: number;
  maxExpandedStates?: number;
  targetProfit?: number;
  villageResetRemaining?: Record<string, Duration>;
  strategy?: OptimizerStrategyOptions;
}

export type OptimizerStrategyPreset = "baseline" | "balanced" | "optimized" | "custom";

export interface OptimizerStrategyFlags {
  smartTradeIntelligence: boolean;
  smartTravelPruning: boolean;
  profitableBuyPruning: boolean;
  crateQuantityCandidates: boolean;
  sellDominance: boolean;
  reachableDemandScoring: boolean;
  tradeChainScoring: boolean;
}

export type OptimizerStrategyOptions = { preset?: OptimizerStrategyPreset } & Partial<OptimizerStrategyFlags>;
export type ResolvedOptimizerStrategy = { preset: OptimizerStrategyPreset } & OptimizerStrategyFlags;

export interface ResolvedOptimizerSearchOptions {
  periodDays: number;
  beamWidth: number;
  maxSteps: number;
  maxExpandedStates: number;
  targetProfit?: number;
  strategy: ResolvedOptimizerStrategy;
}

export interface OptimizerSearchStatistics {
  expandedStates: number;
  generatedStates: number;
  deduplicatedStates: number;
  maxFrontierSize: number;
  currentDepth: number;
  currentFrontierSize: number;
  bestAccumulatedProfit: number;
  peakHeapUsedBytes: number;
  peakRssBytes: number;
  precomputationMs: number;
  generatedBuyActions: number;
  generatedSellActions: number;
  generatedTravelActions: number;
  prunedBuyActions: number;
  prunedSellActions: number;
  prunedTravelActions: number;
  strategicFallbackCount: number;
  terminationReason: "completed" | "brake" | "targetProfit" | "maxSteps" | "maxExpandedStates" | "frontierExhausted";
  elapsedMs: number;
}

export interface OptimizerResult {
  plan: OptimizerPlanStep[];
  finalState: SimulationState;
  accumulatedProfit: number;
  options: ResolvedOptimizerSearchOptions;
  statistics: OptimizerSearchStatistics;
}

export interface OptimizerWorkerRequest {
  world: WorldData;
  options: OptimizerSearchOptions;
  brakeBuffer?: SharedArrayBuffer;
}

export type OptimizerWorkerResponse =
  | { ok: true; result: OptimizerResult }
  | { ok: false; error: { message: string } }
  | { type: "progress"; statistics: OptimizerSearchStatistics };
