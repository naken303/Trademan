import { getTravelTime } from "../domain/route";
import type { Market, Product, SimulationState, WorldData } from "../shared/types";

export interface TradeOpportunity {
  productId: string;
  supplyVillageId: string;
  demandVillageId: string;
  buyPrice: number;
  sellPrice: number;
  grossMarginPerUnit: number;
  grossMarginPerCrate: number;
  shortestTravelHours: number;
  marginPerCrateHour: number;
  supplyMarketId: string;
  demandMarketId: string;
}

export interface OptimizerIntelligence {
  world: WorldData;
  productsById: ReadonlyMap<string, Product>;
  marketsByVillage: ReadonlyMap<string, readonly Market[]>;
  supplyMarketsByProduct: ReadonlyMap<string, readonly Market[]>;
  demandMarketsByProduct: ReadonlyMap<string, readonly Market[]>;
  destinationsByVillage: ReadonlyMap<string, readonly string[]>;
  shortestTravelHours: ReadonlyMap<string, ReadonlyMap<string, number>>;
  paths: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>;
  opportunitiesByProduct: ReadonlyMap<string, readonly TradeOpportunity[]>;
  opportunitiesBySupplyMarket: ReadonlyMap<string, readonly TradeOpportunity[]>;
  commercialVillages: ReadonlySet<string>;
}

const durationHours = (duration: { days: number; hours: number }) => duration.days * 24 + duration.hours;
const push = <T>(map: Map<string, T[]>, key: string, value: T) => map.set(key, [...(map.get(key) ?? []), value]);

function shortestPaths(source: string, destinations: ReadonlyMap<string, readonly string[]>, hours: ReadonlyMap<string, number>) {
  const best = new Map<string, { hours: number; path: string[] }>([[source, { hours: 0, path: [source] }]]);
  const queue = [{ villageId: source, hours: 0, path: [source] }];
  while (queue.length > 0) {
    queue.sort((left, right) => left.hours - right.hours || left.path.join("\0").localeCompare(right.path.join("\0")));
    const current = queue.shift()!;
    const known = best.get(current.villageId);
    if (!known || known.hours !== current.hours || known.path.join("\0") !== current.path.join("\0")) continue;
    for (const next of destinations.get(current.villageId) ?? []) {
      if (current.path.includes(next)) continue;
      const candidate = { hours: current.hours + (hours.get(`${current.villageId}\0${next}`) ?? Infinity), path: [...current.path, next] };
      const previous = best.get(next);
      if (!previous || candidate.hours < previous.hours || (candidate.hours === previous.hours && candidate.path.join("\0").localeCompare(previous.path.join("\0")) < 0)) {
        best.set(next, candidate);
        queue.push({ villageId: next, ...candidate });
      }
    }
  }
  return best;
}

/** Immutable, run-scoped strategic data derived only from the validated WorldData snapshot. */
export function createOptimizerIntelligence(world: WorldData): OptimizerIntelligence {
  const productsById = new Map(world.products.map((product) => [product.id, product]));
  const marketsByVillage = new Map<string, Market[]>();
  const supplyMarketsByProduct = new Map<string, Market[]>();
  const demandMarketsByProduct = new Map<string, Market[]>();
  for (const market of [...world.markets].sort((a, b) => a.id.localeCompare(b.id))) {
    push(marketsByVillage, market.villageId, market);
    push(market.side === "supply" ? supplyMarketsByProduct : demandMarketsByProduct, market.productId, market);
  }

  const villages = [...world.villages].map((village) => village.id).sort();
  const destinationsByVillage = new Map<string, string[]>();
  const directHours = new Map<string, number>();
  for (const from of villages) {
    const destinations = villages.filter((to) => to !== from && getTravelTime(world.routes, from, to));
    destinationsByVillage.set(from, destinations);
    for (const to of destinations) directHours.set(`${from}\0${to}`, durationHours(getTravelTime(world.routes, from, to)!));
  }
  const shortestTravelHours = new Map<string, Map<string, number>>();
  const paths = new Map<string, Map<string, readonly string[]>>();
  for (const source of villages) {
    const found = shortestPaths(source, destinationsByVillage, directHours);
    shortestTravelHours.set(source, new Map([...found].map(([id, value]) => [id, value.hours])));
    paths.set(source, new Map([...found].map(([id, value]) => [id, value.path])));
  }

  const opportunitiesByProduct = new Map<string, TradeOpportunity[]>();
  const opportunitiesBySupplyMarket = new Map<string, TradeOpportunity[]>();
  for (const [productId, supplies] of supplyMarketsByProduct) {
    const product = productsById.get(productId);
    if (!product) continue;
    for (const supply of supplies) for (const demand of demandMarketsByProduct.get(productId) ?? []) {
      const travelHours = shortestTravelHours.get(supply.villageId)?.get(demand.villageId);
      if (demand.unitPrice <= supply.unitPrice || travelHours === undefined) continue;
      const grossMarginPerUnit = demand.unitPrice - supply.unitPrice;
      const grossMarginPerCrate = grossMarginPerUnit * product.unitsPerCrate;
      const opportunity: TradeOpportunity = {
        productId, supplyVillageId: supply.villageId, demandVillageId: demand.villageId,
        buyPrice: supply.unitPrice, sellPrice: demand.unitPrice, grossMarginPerUnit,
        grossMarginPerCrate, shortestTravelHours: travelHours,
        marginPerCrateHour: grossMarginPerCrate / (1 + travelHours),
        supplyMarketId: supply.id, demandMarketId: demand.id,
      };
      push(opportunitiesByProduct, productId, opportunity);
      push(opportunitiesBySupplyMarket, supply.id, opportunity);
    }
  }
  const opportunityOrder = (a: TradeOpportunity, b: TradeOpportunity) => b.marginPerCrateHour - a.marginPerCrateHour || b.grossMarginPerUnit - a.grossMarginPerUnit || a.demandVillageId.localeCompare(b.demandVillageId) || a.supplyMarketId.localeCompare(b.supplyMarketId);
  for (const values of opportunitiesByProduct.values()) values.sort(opportunityOrder);
  for (const values of opportunitiesBySupplyMarket.values()) values.sort(opportunityOrder);

  const commercialVillages = new Set(world.markets.map((market) => market.villageId));
  for (const from of [...commercialVillages]) for (const to of [...commercialVillages]) {
    for (const villageId of paths.get(from)?.get(to) ?? []) commercialVillages.add(villageId);
  }
  return { world, productsById, marketsByVillage, supplyMarketsByProduct, demandMarketsByProduct, destinationsByVillage, shortestTravelHours, paths, opportunitiesByProduct, opportunitiesBySupplyMarket, commercialVillages };
}

export function getShortestTravelHours(intelligence: OptimizerIntelligence, from: string, to: string) {
  return intelligence.shortestTravelHours.get(from)?.get(to);
}

export function getShortestPath(intelligence: OptimizerIntelligence, from: string, to: string): readonly string[] | undefined {
  return intelligence.paths.get(from)?.get(to);
}

export function estimateMarketCapacity(state: SimulationState, market: Market, travelHours: number) {
  const village = state.villages[market.villageId];
  if (!village) return 0;
  const resetHours = durationHours(village.reset.current);
  const resetsBeforeArrival = travelHours >= resetHours;
  const quantity = resetsBeforeArrival ? market.initialQuantity : (village.markets[market.id]?.quantity ?? 0);
  const reserve = resetsBeforeArrival ? village.initialReserveMoney : village.money;
  return market.side === "demand" ? Math.min(quantity, Math.floor(reserve / market.unitPrice)) : quantity;
}
