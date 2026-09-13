import { canAddInventory } from "../domain/inventory";
import { getTravelTime } from "../domain/route";
import type { Market, Product, SimulationState, WorldData } from "../shared/types";
import { createInitialSimulationState, SimulationEngine } from "../simulation";
import { compareForFrontier, compareForResult, createDominanceScore, type ScoredSearchState } from "./scoring";
import { createOptimizerStateSignature } from "./state-signature";
import type { OptimizerStateStore } from "./state-store";
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
  if (![periodDays, beamWidth, maxSteps, maxExpandedStates].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error("Optimizer search limits must be positive integers");
  }
  return { periodDays, beamWidth, maxSteps, maxExpandedStates };
}

function addAround(values: Set<number>, value: number, maximum: number) {
  for (const candidate of [value - 1, value, value + 1]) {
    if (Number.isInteger(candidate) && candidate > 0 && candidate <= maximum) values.add(candidate);
  }
}

function usefulQuantities(maximum: number, product: Product, currentQuantity: number): number[] {
  const values = new Set<number>();
  for (const boundary of [1, maximum, Math.floor(maximum / 2), Math.floor(maximum / 3), Math.floor(maximum * 2 / 3)]) {
    addAround(values, boundary, maximum);
  }
  const crate = product.unitsPerCrate;
  const nextCrate = currentQuantity % crate === 0 ? crate : crate - (currentQuantity % crate);
  for (const boundary of [nextCrate, crate, Math.floor(maximum / crate) * crate]) {
    addAround(values, boundary, maximum);
  }
  return [...values].sort((left, right) => left - right);
}

function maxBuyQuantity(world: WorldData, state: SimulationState, market: Market, product: Product, available: number): number {
  const cashLimit = market.unitPrice === 0 ? available : Math.floor(state.player.money / market.unitPrice);
  let low = 0;
  let high = Math.min(available, cashLimit);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (canAddInventory(state.player.inventory, product, middle, world.products, world.player.inventoryCapacityCrates)) low = middle;
    else high = middle - 1;
  }
  return low;
}

function generateActions(world: WorldData, state: SimulationState): OptimizerAction[] {
  const runtimeVillage = state.villages[state.player.location];
  if (!runtimeVillage) return [];
  const products = new Map(world.products.map((product) => [product.id, product]));
  const actions: OptimizerAction[] = [];

  for (const market of world.markets
    .filter((item) => item.villageId === state.player.location)
    .sort((left, right) => left.id.localeCompare(right.id))) {
    const product = products.get(market.productId);
    const available = runtimeVillage.markets[market.id]?.quantity ?? 0;
    if (!product || available <= 0) continue;
    const inventoryQuantity = state.player.inventory.find((item) => item.productId === product.id)?.quantity ?? 0;
    const maximum = market.side === "supply"
      ? maxBuyQuantity(world, state, market, product, available)
      : Math.min(available, inventoryQuantity, market.unitPrice === 0 ? available : Math.floor(runtimeVillage.money / market.unitPrice));
    for (const quantity of usefulQuantities(maximum, product, inventoryQuantity)) {
      actions.push({ type: market.side === "supply" ? "buy" : "sell", productId: product.id, quantity });
    }
  }

  for (const village of [...world.villages].sort((left, right) => left.id.localeCompare(right.id))) {
    if (village.id !== state.player.location && getTravelTime(world.routes, state.player.location, village.id)) {
      actions.push({ type: "travel", destinationId: village.id });
    }
  }
  return actions;
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

function sortCandidates(world: WorldData, candidates: SearchNode[]): SearchNode[] {
  return candidates.sort((left, right) => compareForFrontier(world, right, left)
    || actionKey(left.plan.at(-1)!.action).localeCompare(actionKey(right.plan.at(-1)!.action)));
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
  const deadline = startHour + resolved.periodDays * 24;
  const initial: SearchNode = { state: initialState, plan: [], tradeActions: 0, firstProfitStep: null };
  let frontier = [initial];
  let best = initial;
  const cache = new Map([[createOptimizerStateSignature(initialState), initial]]);
  const maxCandidatesPerDepth = resolved.beamWidth * 8;
  const statistics: OptimizerSearchStatistics = { expandedStates: 0, generatedStates: 0, deduplicatedStates: 0, maxFrontierSize: 1, currentDepth: 0, currentFrontierSize: 1, bestAccumulatedProfit: 0, peakHeapUsedBytes: 0, peakRssBytes: 0, terminationReason: "completed", elapsedMs: 0 };
  let terminationReason: OptimizerSearchStatistics["terminationReason"] = "completed";
  const report = () => {
    if (control.onProgress) { const memory = process.memoryUsage(); statistics.peakHeapUsedBytes = Math.max(statistics.peakHeapUsedBytes, memory.heapUsed); statistics.peakRssBytes = Math.max(statistics.peakRssBytes, memory.rss); }
    statistics.bestAccumulatedProfit = best.state.accumulatedProfit;
    control.onProgress?.({ ...statistics, terminationReason, elapsedMs: performance.now() - startedAt });
  };
  control.stateStore?.accepts(createOptimizerStateSignature(initialState), createDominanceScore(world, initial));

  for (let depth = 0; depth < resolved.maxSteps && frontier.length > 0; depth += 1) {
    statistics.currentDepth = depth;
    if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
    const nextBySignature = new Map<string, SearchNode>();
    for (const node of frontier) {
      if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
      if (statistics.expandedStates >= resolved.maxExpandedStates) break;
      statistics.expandedStates += 1;
      for (const action of generateActions(world, node.state).sort((left, right) => actionKey(left).localeCompare(actionKey(right)))) {
        if (control.shouldBrake?.()) { terminationReason = "brake"; break; }
        let state: SimulationState;
        try { state = transition(world, node.state, action); } catch { continue; }
        if (absoluteHour(state) > deadline) continue;
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
        if (existing && compareForFrontier(world, candidate, existing) <= 0) {
          statistics.deduplicatedStates += 1;
          continue;
        }
        nextBySignature.set(signature, candidate);
        if (compareForResult(world, candidate, best) > 0) best = candidate;
        if (nextBySignature.size >= maxCandidatesPerDepth * 2) {
          const retained = sortCandidates(world, [...nextBySignature.values()]).slice(0, maxCandidatesPerDepth);
          nextBySignature.clear();
          for (const retainedCandidate of retained) nextBySignature.set(createOptimizerStateSignature(retainedCandidate.state), retainedCandidate);
        }
      }
      if (terminationReason === "brake") break;
    }
    if (terminationReason === "brake") break;
    const survivors = [...nextBySignature.values()].filter((candidate) => {
      const accepted = control.stateStore?.accepts(createOptimizerStateSignature(candidate.state), createDominanceScore(world, candidate)) ?? true;
      if (!accepted) statistics.deduplicatedStates += 1;
      return accepted;
    });
    frontier = sortCandidates(world, survivors).slice(0, resolved.beamWidth);
    cache.clear();
    for (const node of frontier) cache.set(createOptimizerStateSignature(node.state), node);
    statistics.maxFrontierSize = Math.max(statistics.maxFrontierSize, frontier.length);
    statistics.currentFrontierSize = frontier.length;
    report();
    if (statistics.expandedStates >= resolved.maxExpandedStates) { terminationReason = "maxExpandedStates"; break; }
  }

  statistics.elapsedMs = performance.now() - startedAt;
  if (terminationReason === "completed") terminationReason = frontier.length === 0 ? "frontierExhausted" : "maxSteps";
  statistics.terminationReason = terminationReason;
  statistics.bestAccumulatedProfit = best.state.accumulatedProfit;
  report();
  return { plan: compactOptimizerPlan(best.plan), finalState: best.state, accumulatedProfit: best.state.accumulatedProfit, options: resolved, statistics };
}
