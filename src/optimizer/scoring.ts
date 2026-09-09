import type { SimulationState, WorldData } from "../shared/types";
import type { OptimizerPlanStep } from "./types";

export interface ScoredSearchState {
  state: SimulationState;
  plan: OptimizerPlanStep[];
  tradeActions: number;
  firstProfitStep: number | null;
}

const EPSILON = 1e-9;

function compareNumber(left: number, right: number): number {
  if (Object.is(left, right)) return 0;
  return Math.abs(left - right) <= EPSILON ? 0 : left > right ? 1 : -1;
}

function liquidationPotential(world: WorldData, candidate: ScoredSearchState): number {
  return candidate.state.player.inventory.reduce((total, item) => {
    const cost = candidate.state.player.inventoryCost[item.productId] ?? 0;
    const bestPrice = world.markets
      .filter((market) => market.productId === item.productId && market.side === "demand")
      .reduce((highest, market) => Math.max(highest, market.unitPrice), 0);
    return total + Math.max(0, bestPrice * item.quantity - cost);
  }, 0);
}

export function compareForFrontier(world: WorldData, left: ScoredSearchState, right: ScoredSearchState): number {
  // Realized profit always wins. Potential is only a beam-retention heuristic;
  // it is never added to the result's accumulated profit.
  return compareNumber(left.state.accumulatedProfit, right.state.accumulatedProfit)
    || compareNumber(liquidationPotential(world, left), liquidationPotential(world, right))
    || (world.player.continuousMode ? left.tradeActions - right.tradeActions : 0)
    || compareNumber(left.state.player.money, right.state.player.money)
    || right.plan.length - left.plan.length;
}

export function compareForResult(world: WorldData, left: ScoredSearchState, right: ScoredSearchState): number {
  const leftInventoryCost = Object.values(left.state.player.inventoryCost).reduce((total, value) => total + value, 0);
  const rightInventoryCost = Object.values(right.state.player.inventoryCost).reduce((total, value) => total + value, 0);
  // Equal-profit results prefer continuous trading when configured, then cash,
  // less unsold cost basis, earlier realization, and finally the shorter plan.
  return compareNumber(left.state.accumulatedProfit, right.state.accumulatedProfit)
    || (world.player.continuousMode ? left.tradeActions - right.tradeActions : 0)
    || compareNumber(left.state.player.money, right.state.player.money)
    || compareNumber(rightInventoryCost, leftInventoryCost)
    || compareNumber(right.firstProfitStep ?? Infinity, left.firstProfitStep ?? Infinity)
    || right.plan.length - left.plan.length;
}
