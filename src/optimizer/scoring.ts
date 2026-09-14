import type { SimulationState, WorldData } from "../shared/types";
import { canAddInventory } from "../domain/inventory";
import { estimateMarketCapacity, getShortestTravelHours, type OptimizerIntelligence } from "./trade-intelligence";
import type { OptimizerPlanStep } from "./types";
import type { DominanceScore } from "./state-store";

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

/** Currency-equivalent reachable profit discounted monotonically by travel hours. */
export function reachableInventoryPotential(intelligence: OptimizerIntelligence, candidate: ScoredSearchState): number {
  let total = 0;
  for (const item of candidate.state.player.inventory) {
    let remaining = item.quantity;
    const averageCost = (candidate.state.player.inventoryCost[item.productId] ?? 0) / item.quantity;
    const demands = (intelligence.demandMarketsByProduct.get(item.productId) ?? []).flatMap((market) => {
      const hours = getShortestTravelHours(intelligence, candidate.state.player.location, market.villageId);
      if (hours === undefined || market.unitPrice <= averageCost) return [];
      const capacity = estimateMarketCapacity(candidate.state, market, hours);
      return [{ market, capacity, efficiency: (market.unitPrice - averageCost) / (1 + hours) }];
    }).sort((a, b) => b.efficiency - a.efficiency || b.market.unitPrice - a.market.unitPrice || a.market.id.localeCompare(b.market.id));
    for (const demand of demands) {
      const quantity = Math.min(remaining, demand.capacity);
      total += quantity * demand.efficiency;
      remaining -= quantity;
      if (remaining === 0) break;
    }
  }
  return total;
}

/** A shallow one-crate continuation signal in the same travel-discounted currency units. */
export function tradeChainPotential(intelligence: OptimizerIntelligence, candidate: ScoredSearchState): number {
  let best = 0;
  for (const opportunities of intelligence.opportunitiesBySupplyMarket.values()) {
    const opportunity = opportunities[0];
    if (!opportunity) continue;
    const product = intelligence.productsById.get(opportunity.productId);
    if (!product || candidate.state.player.money < opportunity.buyPrice || !canAddInventory(candidate.state.player.inventory, product, 1, intelligence.world.products, intelligence.world.player.inventoryCapacityCrates)) continue;
    const toSupply = getShortestTravelHours(intelligence, candidate.state.player.location, opportunity.supplyVillageId);
    if (toSupply !== undefined) best = Math.max(best, opportunity.grossMarginPerCrate / (1 + toSupply + opportunity.shortestTravelHours));
  }
  return best;
}

export function searchHeuristicScore(intelligence: OptimizerIntelligence, candidate: ScoredSearchState): number {
  return candidate.state.accumulatedProfit + reachableInventoryPotential(intelligence, candidate) + tradeChainPotential(intelligence, candidate);
}

export function compareForFrontier(intelligence: OptimizerIntelligence, left: ScoredSearchState, right: ScoredSearchState): number {
  return compareNumber(searchHeuristicScore(intelligence, left), searchHeuristicScore(intelligence, right))
    || compareNumber(left.state.accumulatedProfit, right.state.accumulatedProfit)
    || compareNumber(reachableInventoryPotential(intelligence, left), reachableInventoryPotential(intelligence, right))
    || (intelligence.world.player.continuousMode ? left.tradeActions - right.tradeActions : 0)
    || compareNumber(left.state.player.money, right.state.player.money)
    || right.plan.length - left.plan.length;
}

export function createDominanceScore(intelligence: OptimizerIntelligence, candidate: ScoredSearchState): DominanceScore {
  return {
    accumulatedProfit: candidate.state.accumulatedProfit,
    liquidationPotential: reachableInventoryPotential(intelligence, candidate) + tradeChainPotential(intelligence, candidate),
    tradeActions: candidate.tradeActions,
    playerMoney: candidate.state.player.money,
    planLength: candidate.plan.length,
  };
}

export function compareForResult(world: WorldData, left: ScoredSearchState, right: ScoredSearchState): number {
  const leftInventoryCost = Object.values(left.state.player.inventoryCost).reduce((total, value) => total + value, 0);
  const rightInventoryCost = Object.values(right.state.player.inventoryCost).reduce((total, value) => total + value, 0);
  return compareNumber(left.state.accumulatedProfit, right.state.accumulatedProfit)
    || (world.player.continuousMode ? left.tradeActions - right.tradeActions : 0)
    || compareNumber(left.state.player.money, right.state.player.money)
    || compareNumber(rightInventoryCost, leftInventoryCost)
    || compareNumber(right.firstProfitStep ?? Infinity, left.firstProfitStep ?? Infinity)
    || right.plan.length - left.plan.length;
}
