import type { SimulationState, WorldData } from "../shared/types";
import { createInitialSimulationState, SimulationEngine } from "../simulation";
import { generateStrategicActions, type CandidateGenerationStats } from "./candidate-generator";
import { compareForFrontier, compareForResult, createDominanceScore, type ScoredSearchState } from "./scoring";
import { createOptimizerStateSignature } from "./state-signature";
import type { OptimizerStateStore } from "./state-store";
import { resolveOptimizerStrategy } from "./strategy";
import { createOptimizerIntelligence, estimateMarketCapacity, getShortestPath, getShortestTravelHours, type OptimizerIntelligence } from "./trade-intelligence";
import type {
  OptimizerAction, OptimizerPlanStep, OptimizerResult, OptimizerSearchOptions,
  ResolvedOptimizerSearchOptions, OptimizerSearchStatistics,
} from "./types";

type SearchNode = ScoredSearchState;

export interface OptimizerRunControl {
  shouldBrake?: () => boolean;
  onProgress?: (statistics: import("./types").OptimizerSearchStatistics) => void;
  stateStore?: OptimizerStateStore;
}

function resolveOptions(world: WorldData, options: OptimizerSearchOptions): ResolvedOptimizerSearchOptions {
  const periodDays = options.periodDays ?? world.optimization.periodDays;
  const beamWidth = options.beamWidth ?? world.optimization.beamWidth ?? 100;
  const maxSteps = options.maxSteps ?? world.optimization.maxSteps ?? 40;
  const maxExpandedStates = options.maxExpandedStates ?? beamWidth * maxSteps * 4;
  const targetProfit = options.targetProfit;
  if (![periodDays, beamWidth, maxSteps, maxExpandedStates].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error("Optimizer search limits must be positive integers");
  }
  if (targetProfit !== undefined && (!Number.isFinite(targetProfit) || targetProfit <= 0)) throw new Error("Optimizer target profit must be positive");
  return { periodDays, beamWidth, maxSteps, maxExpandedStates, targetProfit, strategy: resolveOptimizerStrategy(options.strategy) };
}

function transition(world: WorldData, state: SimulationState, action: OptimizerAction): SimulationState {
  const engine = new SimulationEngine(state, world.products, world.routes, world.markets, world.player.inventoryCapacityCrates);
  if (action.type === "buy") return engine.buy(action.productId, action.quantity);
  if (action.type === "sell") return engine.sell(action.productId, action.quantity);
  return engine.travel(action.destinationId);
}

function absoluteHour(state: SimulationState): number {
  return state.time.day * 24 + state.time.hour;
}

function actionKey(action: OptimizerAction): string {
  return action.type === "travel" ? `travel:${action.destinationId}` : `${action.type}:${action.productId}:${action.quantity}`;
}

function sortCandidates(context: OptimizerIntelligence, strategy: ResolvedOptimizerSearchOptions["strategy"], candidates: SearchNode[]): SearchNode[] {
  return candidates.sort((left, right) => compareForFrontier(context, strategy, right, left)
    || actionKey(left.plan.at(-1)!.action).localeCompare(actionKey(right.plan.at(-1)!.action)));
}

function addPlanStep(plan: OptimizerPlanStep[], action: OptimizerAction, state: SimulationState) {
  plan.push({ action, time: state.time, villageId: state.player.location, playerMoney: state.player.money, accumulatedProfit: state.accumulatedProfit });
}

function liquidationPath(world: WorldData, context: OptimizerIntelligence, state: SimulationState, deadline: number): string[] | undefined {
  const inventoryProducts = new Set(state.player.inventory.filter((item) => item.quantity > 0).map((item) => item.productId));
  const candidates = world.markets.filter((market) => market.side === "demand" && inventoryProducts.has(market.productId)).flatMap((market) => {
    const hours = getShortestTravelHours(context, state.player.location, market.villageId);
    const path = getShortestPath(context, state.player.location, market.villageId);
    if (hours === undefined || !path || path.length < 2 || absoluteHour(state) + hours > deadline || estimateMarketCapacity(state, market, hours) <= 0) return [];
    return [{ market, hours, path: [...path.slice(1)] }];
  }).sort((a, b) => a.hours - b.hours || b.market.unitPrice - a.market.unitPrice || a.market.id.localeCompare(b.market.id));
  return candidates[0]?.path;
}

function liquidateInventory(world: WorldData, context: OptimizerIntelligence, initialState: SimulationState, initialPlan: OptimizerPlanStep[], deadline: number): { state: SimulationState; plan: OptimizerPlanStep[] } {
  let state = initialState;
  const plan = [...initialPlan];
  for (let attempts = 0; attempts < world.markets.length * 2 + world.villages.length * 2 && state.player.inventory.some((item) => item.quantity > 0); attempts += 1) {
    let sold = false;
    for (const market of context.marketsByVillage.get(state.player.location) ?? []) {
      if (market.side !== "demand") continue;
      const inventory = state.player.inventory.find((item) => item.productId === market.productId)?.quantity ?? 0;
      const available = state.villages[state.player.location]?.markets[market.id]?.quantity ?? 0;
      const reserve = state.villages[state.player.location]?.money ?? 0;
      const quantity = Math.min(inventory, available, Math.floor(reserve / market.unitPrice));
      if (quantity <= 0) continue;
      const engine = new SimulationEngine(state, world.products, world.routes, world.markets, world.player.inventoryCapacityCrates);
      state = engine.sell(market.productId, quantity);
      addPlanStep(plan, { type: "sell", productId: market.productId, quantity }, state);
      sold = true;
    }
    if (state.player.inventory.length === 0) break;
    const path = liquidationPath(world, context, state, deadline);
    if (!path) break;
    for (const destinationId of path) {
      const engine = new SimulationEngine(state, world.products, world.routes, world.markets, world.player.inventoryCapacityCrates);
      state = engine.travel(destinationId);
      addPlanStep(plan, { type: "travel", destinationId }, state);
    }
    if (!sold && path.length === 0) break;
  }
  return { state, plan };
}

/** Consecutive trades at the same village/product have no time or price change, so one combined action replays identically. */
export function compactOptimizerPlan(plan: OptimizerPlanStep[]): OptimizerPlanStep[] {
  return plan.reduce<OptimizerPlanStep[]>((compacted, step) => {
    const previous = compacted.at(-1);
    if (previous
      && previous.villageId === step.villageId
      && previous.action.type === step.action.type
      && (step.action.type === "buy" || step.action.type === "sell")
      && (previous.action.type === "buy" || previous.action.type === "sell")
      && previous.action.productId === step.action.productId) {
      compacted[compacted.length - 1] = { ...step, action: { ...step.action, quantity: previous.action.quantity + step.action.quantity } };
    } else compacted.push(step);
    return compacted;
  }, []);
}

export function runOptimizer(world: WorldData, options: OptimizerSearchOptions = {}, control: OptimizerRunControl = {}): OptimizerResult {
  const startedAt = performance.now();
  const resolved = resolveOptions(world, options);
  const initialState = createInitialSimulationState(world, {
    villageResetRemaining: options.villageResetRemaining ?? Object.fromEntries(
      world.villages.map((village) => [village.id, village.reset.afterReset]),
    ),
  });
  const startHour = absoluteHour(initialState);
  const targetMode = resolved.targetProfit !== undefined;
  const deadline = targetMode ? Infinity : startHour + resolved.periodDays * 24;
  const precomputeStartedAt = performance.now();
  const context = createOptimizerIntelligence(world, resolved.strategy);
  const precomputationMs = performance.now() - precomputeStartedAt;
  const initial: SearchNode = { state: initialState, plan: [], tradeActions: 0, firstProfitStep: null };
  let frontier = [initial];
  let best = initial;
  const cache = new Map([[createOptimizerStateSignature(initialState), initial]]);
  const maxCandidatesPerDepth = resolved.beamWidth * 8;
  const pruningStats: CandidateGenerationStats = { generatedBuyActions: 0, generatedSellActions: 0, generatedTravelActions: 0, prunedBuyActions: 0, prunedSellActions: 0, prunedTravelActions: 0, strategicFallbackCount: 0 };
  const statistics: OptimizerSearchStatistics = { expandedStates: 0, generatedStates: 0, deduplicatedStates: 0, maxFrontierSize: 1, currentDepth: 0, currentFrontierSize: 1, bestAccumulatedProfit: 0, peakHeapUsedBytes: 0, peakRssBytes: 0, precomputationMs, ...pruningStats, terminationReason: "completed", elapsedMs: 0 };
  let terminationReason: OptimizerSearchStatistics["terminationReason"] = "completed";
  const report = () => {
    const memory = process.memoryUsage(); statistics.peakHeapUsedBytes = Math.max(statistics.peakHeapUsedBytes, memory.heapUsed); statistics.peakRssBytes = Math.max(statistics.peakRssBytes, memory.rss);
    Object.assign(statistics, pruningStats);
    statistics.bestAccumulatedProfit = best.state.accumulatedProfit;
    control.onProgress?.({ ...statistics, terminationReason, elapsedMs: performance.now() - startedAt });
  };
  control.stateStore?.accepts(createOptimizerStateSignature(initialState), createDominanceScore(context, resolved.strategy, initial));

  for (let depth = 0; (targetMode || depth < resolved.maxSteps) && frontier.length > 0; depth += 1) {
    statistics.currentDepth = depth;
    if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
    const nextBySignature = new Map<string, SearchNode>();
    for (const node of frontier) {
      if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
      if (!targetMode && statistics.expandedStates >= resolved.maxExpandedStates) break;
      statistics.expandedStates += 1;
      for (const action of generateStrategicActions(context, node.state, deadline, targetMode, resolved.strategy, pruningStats).sort((left, right) => actionKey(left).localeCompare(actionKey(right)))) {
        if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
        let state: SimulationState;
        try { state = transition(world, node.state, action); } catch { continue; }
        if (!targetMode && absoluteHour(state) > deadline) continue;
        statistics.generatedStates += 1;
        const profitIncreased = state.accumulatedProfit > node.state.accumulatedProfit;
        const candidate: SearchNode = {
          state,
          plan: [...node.plan, { action, time: state.time, villageId: state.player.location, playerMoney: state.player.money, accumulatedProfit: state.accumulatedProfit }],
          tradeActions: node.tradeActions + (action.type === "travel" ? 0 : 1),
          firstProfitStep: node.firstProfitStep ?? (profitIncreased ? depth + 1 : null),
        };
        const signature = createOptimizerStateSignature(state);
        const existing = nextBySignature.get(signature) ?? cache.get(signature);
        if (existing && compareForFrontier(context, resolved.strategy, candidate, existing) <= 0) {
          statistics.deduplicatedStates += 1;
          continue;
        }
        nextBySignature.set(signature, candidate);
        if (compareForResult(world, candidate, best) > 0) best = candidate;
        if (targetMode && best.state.accumulatedProfit >= resolved.targetProfit!) { terminationReason = "targetProfit"; break; }
        if (nextBySignature.size >= maxCandidatesPerDepth * 2) {
          const retained = sortCandidates(context, resolved.strategy, [...nextBySignature.values()]).slice(0, maxCandidatesPerDepth);
          nextBySignature.clear();
          for (const retainedCandidate of retained) nextBySignature.set(createOptimizerStateSignature(retainedCandidate.state), retainedCandidate);
        }
      }
      if (terminationReason === "brake" || terminationReason === "targetProfit") break;
    }
    if (terminationReason === "brake" || terminationReason === "targetProfit") break;
    const survivors = [...nextBySignature.values()].filter((candidate) => {
      const accepted = control.stateStore?.accepts(createOptimizerStateSignature(candidate.state), createDominanceScore(context, resolved.strategy, candidate)) ?? true;
      if (!accepted) statistics.deduplicatedStates += 1;
      return accepted;
    });
    frontier = sortCandidates(context, resolved.strategy, survivors).slice(0, resolved.beamWidth);
    cache.clear();
    for (const node of frontier) cache.set(createOptimizerStateSignature(node.state), node);
    statistics.maxFrontierSize = Math.max(statistics.maxFrontierSize, frontier.length);
    statistics.currentFrontierSize = frontier.length;
    report();
    if (!targetMode && statistics.expandedStates >= resolved.maxExpandedStates) { terminationReason = "maxExpandedStates"; break; }
  }

  statistics.elapsedMs = performance.now() - startedAt;
  if (terminationReason === "completed") terminationReason = frontier.length === 0 ? "frontierExhausted" : "maxSteps";
  statistics.terminationReason = terminationReason;
  statistics.bestAccumulatedProfit = best.state.accumulatedProfit;
  report();
  const finalized = terminationReason === "maxSteps" || terminationReason === "targetProfit"
    ? liquidateInventory(world, context, best.state, best.plan, deadline)
    : { state: best.state, plan: best.plan };
  return { plan: compactOptimizerPlan(finalized.plan), finalState: finalized.state, accumulatedProfit: finalized.state.accumulatedProfit, options: resolved, statistics };
}
