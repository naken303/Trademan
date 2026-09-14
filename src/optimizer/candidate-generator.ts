import { canAddInventory } from "../domain/inventory";
import type { Market, Product, SimulationState } from "../shared/types";
import type { OptimizerAction } from "./types";
import { estimateMarketCapacity, getShortestPath, getShortestTravelHours, type OptimizerIntelligence } from "./trade-intelligence";

export interface CandidateGenerationStats { prunedBuyActions: number; prunedTravelActions: number; strategicFallbackCount: number }

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

function economicBuyQuantities(intelligence: OptimizerIntelligence, state: SimulationState, market: Market, product: Product, maximum: number) {
  const values = new Set<number>();
  const add = (value: number) => { if (Number.isInteger(value) && value > 0 && value <= maximum) values.add(value); };
  add(maximum);
  const opportunities = intelligence.opportunitiesBySupplyMarket.get(market.id) ?? [];
  const capacities = opportunities.map((opportunity) => {
    const demand = intelligence.world.markets.find((item) => item.id === opportunity.demandMarketId)!;
    return estimateMarketCapacity(state, demand, opportunity.shortestTravelHours);
  }).filter((value) => value > 0);
  add(capacities[0] ?? 0);
  add(capacities.reduce((total, value) => total + value, 0));
  const held = state.player.inventory.find((item) => item.productId === product.id)?.quantity ?? 0;
  const nextCrateBoundary = product.unitsPerCrate - (held % product.unitsPerCrate || 0);
  add(nextCrateBoundary || product.unitsPerCrate);
  add(Math.floor(maximum / product.unitsPerCrate) * product.unitsPerCrate);
  const otherProfitableProduct = (intelligence.marketsByVillage.get(state.player.location) ?? []).some((item) => item.side === "supply" && item.productId !== product.id && (intelligence.opportunitiesBySupplyMarket.get(item.id)?.length ?? 0) > 0);
  if (otherProfitableProduct) add(maximum - product.unitsPerCrate);
  return [...values].sort((a, b) => a - b);
}

function sellQuantities(intelligence: OptimizerIntelligence, state: SimulationState, market: Market, maximum: number, averageCost: number) {
  const values = new Set([maximum]);
  const betterCapacity = (intelligence.demandMarketsByProduct.get(market.productId) ?? [])
    .filter((demand) => demand.villageId !== market.villageId && demand.unitPrice > market.unitPrice && demand.unitPrice > averageCost)
    .reduce((total, demand) => {
      const hours = getShortestTravelHours(intelligence, state.player.location, demand.villageId);
      return total + (hours === undefined ? 0 : estimateMarketCapacity(state, demand, hours));
    }, 0);
  const held = state.player.inventory.find((item) => item.productId === market.productId)?.quantity ?? 0;
  const sellSurplus = Math.min(maximum, held - betterCapacity);
  if (sellSurplus > 0) values.add(sellSurplus);
  return [...values].sort((a, b) => a - b);
}

export function generateStrategicActions(intelligence: OptimizerIntelligence, state: SimulationState, deadline: number, targetMode: boolean, stats?: CandidateGenerationStats): OptimizerAction[] {
  const runtimeVillage = state.villages[state.player.location];
  if (!runtimeVillage) return [];
  const actions: OptimizerAction[] = [];
  for (const market of intelligence.marketsByVillage.get(state.player.location) ?? []) {
    const product = intelligence.productsById.get(market.productId);
    const available = runtimeVillage.markets[market.id]?.quantity ?? 0;
    if (!product || available <= 0) continue;
    const held = state.player.inventory.find((item) => item.productId === product.id)?.quantity ?? 0;
    if (market.side === "supply") {
      const opportunities = intelligence.opportunitiesBySupplyMarket.get(market.id) ?? [];
      const plausible = opportunities.some((opportunity) => targetMode || state.time.day * 24 + state.time.hour + opportunity.shortestTravelHours <= deadline);
      if (!plausible) { if (stats) stats.prunedBuyActions += 1; continue; }
      const maximum = maxBuyQuantity(intelligence, state, market, product, available);
      for (const quantity of economicBuyQuantities(intelligence, state, market, product, maximum)) actions.push({ type: "buy", productId: product.id, quantity });
    } else {
      const maximum = Math.min(available, held, Math.floor(runtimeVillage.money / market.unitPrice));
      if (maximum <= 0) continue;
      const averageCost = (state.player.inventoryCost[product.id] ?? 0) / held;
      for (const quantity of sellQuantities(intelligence, state, market, maximum, averageCost)) actions.push({ type: "sell", productId: product.id, quantity });
    }
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
  const legalDestinations = intelligence.destinationsByVillage.get(state.player.location) ?? [];
  for (const destinationId of [...strategicNextHops].sort()) actions.push({ type: "travel", destinationId });
  if (strategicNextHops.size === 0 && actions.length === 0) {
    if (stats) stats.strategicFallbackCount += 1;
    for (const destinationId of legalDestinations) actions.push({ type: "travel", destinationId });
  } else if (stats) stats.prunedTravelActions += legalDestinations.filter((destination) => !strategicNextHops.has(destination)).length;
  return actions;
}
