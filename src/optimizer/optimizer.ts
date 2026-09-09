import { canAddInventory } from "../domain/inventory";
import { getTravelTime } from "../domain/route";
import type { Market, Product, SimulationState, WorldData } from "../shared/types";
import { createInitialSimulationState, SimulationEngine } from "../simulation";
import { compareForFrontier, compareForResult, type ScoredSearchState } from "./scoring";
import { createOptimizerStateSignature } from "./state-signature";
import type {
  OptimizerAction, OptimizerResult, OptimizerSearchOptions,
  ResolvedOptimizerSearchOptions,
} from "./types";

type SearchNode = ScoredSearchState;

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

export function runOptimizer(world: WorldData, options: OptimizerSearchOptions = {}): OptimizerResult {
  const startedAt = performance.now();
  const resolved = resolveOptions(world, options);
  const initialState = createInitialSimulationState(world);
  const startHour = absoluteHour(initialState);
  const deadline = startHour + resolved.periodDays * 24;
  const initial: SearchNode = { state: initialState, plan: [], tradeActions: 0, firstProfitStep: null };
  let frontier = [initial];
  let best = initial;
  const cache = new Map([[createOptimizerStateSignature(initialState), initial]]);
  const statistics = { expandedStates: 0, generatedStates: 0, deduplicatedStates: 0, maxFrontierSize: 1, elapsedMs: 0 };

  for (let depth = 0; depth < resolved.maxSteps && frontier.length > 0; depth += 1) {
    const nextBySignature = new Map<string, SearchNode>();
    for (const node of frontier) {
      if (statistics.expandedStates >= resolved.maxExpandedStates) break;
      statistics.expandedStates += 1;
      for (const action of generateActions(world, node.state).sort((left, right) => actionKey(left).localeCompare(actionKey(right)))) {
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
        const existing = cache.get(signature);
        if (existing && compareForFrontier(world, candidate, existing) <= 0) {
          statistics.deduplicatedStates += 1;
          continue;
        }
        cache.set(signature, candidate);
        nextBySignature.set(signature, candidate);
        if (compareForResult(world, candidate, best) > 0) best = candidate;
      }
    }
    const next = [...nextBySignature.values()];
    next.sort((left, right) => compareForFrontier(world, right, left) || actionKey(left.plan.at(-1)!.action).localeCompare(actionKey(right.plan.at(-1)!.action)));
    frontier = next.slice(0, resolved.beamWidth);
    statistics.maxFrontierSize = Math.max(statistics.maxFrontierSize, frontier.length);
    if (statistics.expandedStates >= resolved.maxExpandedStates) break;
  }

  statistics.elapsedMs = performance.now() - startedAt;
  return { plan: best.plan, finalState: best.state, accumulatedProfit: best.state.accumulatedProfit, options: resolved, statistics };
}
