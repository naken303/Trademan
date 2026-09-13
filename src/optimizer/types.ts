import type { Duration, SimulationState, WorldData } from "../shared/types";

export interface OptimizerInput {
  world: WorldData;
  periodDays: number;
  beamWidth?: number;
  maxSteps?: number;
  maxExpandedStates?: number;
  targetProfit?: number;
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
}

export interface ResolvedOptimizerSearchOptions {
  periodDays: number;
  beamWidth: number;
  maxSteps: number;
  maxExpandedStates: number;
  targetProfit?: number;
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
