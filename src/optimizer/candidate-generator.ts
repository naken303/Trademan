import { canAddInventory } from "../domain/inventory";
import type { Market, Product, SimulationState } from "../shared/types";
import type { OptimizerAction, ResolvedOptimizerStrategy } from "./types";
import { estimateMarketCapacity, getShortestPath, getShortestTravelHours, type OptimizerIntelligence } from "./trade-intelligence";

export interface CandidateGenerationStats {
  generatedBuyActions: number; generatedSellActions: number; generatedTravelActions: number;
  prunedBuyActions: number; prunedSellActions: number; prunedTravelActions: number; strategicFallbackCount: number;
}

function maxBuyQuantity(intelligence: OptimizerIntelligence, state: SimulationState, market: Market, product: Product, available: number) {
  let low = 0;
  let high = Math.min(available, Math.floor(state.player.money / market.unitPrice));
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (canAddInventory(state.player.inventory, product, middle, intelligence.world.products, intelligence.world.player.inventoryCapacityCrates)) low = middle;
    else high = middle - 1;
  }
  return low;
}

/** The bounded pre-guided quantity generator retained for Baseline/A-B comparison. */
export function usefulQuantities(maximum: number, unitsPerCrate: number): number[] {
  const values = new Set<number>();
  const add = (value: number) => { if (Number.isInteger(value) && value > 0 && value <= maximum) values.add(value); };
  const boundaries = [1, maximum, Math.floor(maximum / 2), Math.floor(maximum / 3), Math.floor(maximum * 2 / 3), Math.floor(maximum / unitsPerCrate) * unitsPerCrate, unitsPerCrate];
  for (const boundary of boundaries) { add(boundary - 1); add(boundary); add(boundary + 1); }
  return [...values].sort((a, b) => a - b);
}

function economicBuyQuantities(intelligence: OptimizerIntelligence, state: SimulationState, market: Market, product: Product, maximum: number, useTradeIntelligence: boolean) {
  const values = new Set<number>();
  const add = (value: number) => { if (Number.isInteger(value) && value > 0 && value <= maximum) values.add(value); };
  add(maximum); add(product.unitsPerCrate);
  const held = state.player.inventory.find((item) => item.productId === product.id)?.quantity ?? 0;
  add(product.unitsPerCrate - (held % product.unitsPerCrate || 0));
  add(Math.floor(maximum / product.unitsPerCrate) * product.unitsPerCrate);
  if (useTradeIntelligence) {
    const capacities = (intelligence.opportunitiesBySupplyMarket.get(market.id) ?? []).map((opportunity) => {
      const demand = intelligence.marketsById.get(opportunity.demandMarketId);
      return demand ? estimateMarketCapacity(state, demand, opportunity.shortestTravelHours) : 0;
    }).filter((value) => value > 0);
    add(capacities[0] ?? 0);
    add(capacities.reduce((total, value) => total + value, 0));
    const anotherProduct = (intelligence.marketsByVillage.get(state.player.location) ?? []).some((item) => item.side === "supply" && item.productId !== product.id && (intelligence.opportunitiesBySupplyMarket.get(item.id)?.length ?? 0) > 0);
    if (anotherProduct) add(maximum - product.unitsPerCrate);
  }
  return [...values].sort((a, b) => a - b);
}

function dominantSellQuantities(intelligence: OptimizerIntelligence, state: SimulationState, market: Market, maximum: number, averageCost: number) {
  const values = new Set([maximum]);
  const betterCapacity = (intelligence.demandMarketsByProduct.get(market.productId) ?? [])
    .filter((demand) => demand.villageId !== market.villageId && demand.unitPrice > market.unitPrice && demand.unitPrice > averageCost)
    .reduce((total, demand) => {
      const hours = getShortestTravelHours(intelligence, state.player.location, demand.villageId);
      return total + (hours === undefined ? 0 : estimateMarketCapacity(state, demand, hours));
    }, 0);
  const held = state.player.inventory.find((item) => item.productId === market.productId)?.quantity ?? 0;
  const surplus = Math.min(maximum, held - betterCapacity);
  if (surplus > 0) values.add(surplus);
  return [...values].sort((a, b) => a - b);
}

function addAction(actions: OptimizerAction[], action: OptimizerAction, stats?: CandidateGenerationStats) {
  actions.push(action);
  if (!stats) return;
  if (action.type === "buy") stats.generatedBuyActions += 1;
  else if (action.type === "sell") stats.generatedSellActions += 1;
  else stats.generatedTravelActions += 1;
}

export function generateStrategicActions(intelligence: OptimizerIntelligence, state: SimulationState, deadline: number, targetMode: boolean, strategy: ResolvedOptimizerStrategy, stats?: CandidateGenerationStats): OptimizerAction[] {
  const runtimeVillage = state.villages[state.player.location];
  if (!runtimeVillage) return [];
  const actions: OptimizerAction[] = [];
  for (const market of intelligence.marketsByVillage.get(state.player.location) ?? []) {
    const product = intelligence.productsById.get(market.productId);
    const available = runtimeVillage.markets[market.id]?.quantity ?? 0;
    if (!product || available <= 0) continue;
    const held = state.player.inventory.find((item) => item.productId === product.id)?.quantity ?? 0;
    if (market.side === "supply") {
      if (strategy.profitableBuyPruning) {
        const opportunities = intelligence.opportunitiesBySupplyMarket.get(market.id) ?? [];
        const plausible = opportunities.some((opportunity) => targetMode || state.time.day * 24 + state.time.hour + opportunity.shortestTravelHours <= deadline);
        if (!plausible) { if (stats) stats.prunedBuyActions += 1; continue; }
      }
      const maximum = maxBuyQuantity(intelligence, state, market, product, available);
      const quantities = strategy.crateQuantityCandidates ? economicBuyQuantities(intelligence, state, market, product, maximum, strategy.smartTradeIntelligence) : usefulQuantities(maximum, product.unitsPerCrate);
      for (const quantity of quantities) addAction(actions, { type: "buy", productId: product.id, quantity }, stats);
    } else {
      const maximum = Math.min(available, held, Math.floor(runtimeVillage.money / market.unitPrice));
      if (maximum <= 0) continue;
      const legacy = usefulQuantities(maximum, product.unitsPerCrate);
      const quantities = strategy.sellDominance ? dominantSellQuantities(intelligence, state, market, maximum, (state.player.inventoryCost[product.id] ?? 0) / held) : legacy;
      if (stats && strategy.sellDominance) stats.prunedSellActions += legacy.length - quantities.length;
      for (const quantity of quantities) addAction(actions, { type: "sell", productId: product.id, quantity }, stats);
    }
  }

  const legalDestinations = intelligence.destinationsByVillage.get(state.player.location) ?? [];
  if (!strategy.smartTravelPruning) {
    for (const destinationId of legalDestinations) addAction(actions, { type: "travel", destinationId }, stats);
    return actions;
  }
  const strategicNextHops = new Set<string>();
  const remainingHours = deadline - (state.time.day * 24 + state.time.hour);
  const addObjective = (villageId: string, extraHours = 0) => {
    const hours = getShortestTravelHours(intelligence, state.player.location, villageId);
    const path = getShortestPath(intelligence, state.player.location, villageId);
    if (hours !== undefined && path && path.length > 1 && (targetMode || hours + extraHours <= remainingHours)) strategicNextHops.add(path[1]);
  };
  for (const item of state.player.inventory) {
    const averageCost = (state.player.inventoryCost[item.productId] ?? 0) / item.quantity;
    for (const demand of intelligence.demandMarketsByProduct.get(item.productId) ?? []) if (demand.unitPrice > averageCost) addObjective(demand.villageId);
  }
  for (const opportunities of intelligence.opportunitiesBySupplyMarket.values()) for (const opportunity of opportunities.slice(0, 2)) {
    const product = intelligence.productsById.get(opportunity.productId);
    if (!product || state.player.money < opportunity.buyPrice || !canAddInventory(state.player.inventory, product, 1, intelligence.world.products, intelligence.world.player.inventoryCapacityCrates)) continue;
    const toSupply = getShortestTravelHours(intelligence, state.player.location, opportunity.supplyVillageId);
    if (toSupply !== undefined && (targetMode || toSupply + opportunity.shortestTravelHours <= remainingHours)) addObjective(opportunity.supplyVillageId, opportunity.shortestTravelHours);
  }
  for (const destinationId of [...strategicNextHops].sort()) addAction(actions, { type: "travel", destinationId }, stats);
  if (strategicNextHops.size === 0 && actions.length === 0) {
    if (stats) stats.strategicFallbackCount += 1;
    for (const destinationId of legalDestinations) addAction(actions, { type: "travel", destinationId }, stats);
  } else if (stats) stats.prunedTravelActions += legalDestinations.filter((destination) => !strategicNextHops.has(destination)).length;
  return actions;
}
