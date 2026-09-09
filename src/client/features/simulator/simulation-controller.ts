import { getTravelTime } from "../../../domain/route";
import type { Duration, Market, Product, SimulationState, Village, WorldData } from "../../../shared/types";
import { createInitialSimulationState, SimulationEngine } from "../../../simulation";

export interface SimulationDestination { village: Village; travelTime: Duration }
export interface SimulationMarket { market: Market; product: Product; quantity: number }
export interface SimulationSnapshot {
  state: SimulationState;
  currentVillage: Village;
  currentVillageMoney: number;
  currentVillageReset: Duration;
  destinations: SimulationDestination[];
  markets: SimulationMarket[];
  products: Product[];
  currency: string;
  inventoryCapacityCrates: number;
  usedInventoryCrates: number;
}

export class SimulationController {
  private readonly world: WorldData;
  private readonly engine: SimulationEngine;

  constructor(world: WorldData) {
    this.world = structuredClone(world);
    this.engine = new SimulationEngine(
      createInitialSimulationState(this.world), this.world.products, this.world.routes,
      this.world.markets, this.world.player.inventoryCapacityCrates,
    );
  }

  getSnapshot(): SimulationSnapshot {
    const state = this.engine.getState();
    const currentVillage = this.world.villages.find((village) => village.id === state.player.location);
    const runtimeVillage = state.villages[state.player.location];
    if (!currentVillage || !runtimeVillage) throw new Error("Current village does not exist");

    const productsById = new Map(this.world.products.map((product) => [product.id, product]));
    const markets = this.world.markets
      .filter((market) => market.villageId === currentVillage.id)
      .map((market) => {
        const product = productsById.get(market.productId);
        if (!product) throw new Error(`Unknown product: ${market.productId}`);
        return { market, product, quantity: runtimeVillage.markets[market.id]?.quantity ?? 0 };
      });
    const destinations = this.world.villages.flatMap((village) => {
      if (village.id === currentVillage.id) return [];
      const travelTime = getTravelTime(this.world.routes, currentVillage.id, village.id);
      return travelTime ? [{ village, travelTime }] : [];
    });

    return {
      state, currentVillage, currentVillageMoney: runtimeVillage.money,
      currentVillageReset: structuredClone(runtimeVillage.reset.current), destinations, markets,
      products: structuredClone(this.world.products), currency: this.world.settings.currency,
      inventoryCapacityCrates: this.world.player.inventoryCapacityCrates,
      usedInventoryCrates: this.engine.getUsedInventoryCrates(),
    };
  }

  travel(destinationId: string) { this.engine.travel(destinationId); return this.getSnapshot(); }
  buy(productId: string, quantity: number) { this.engine.buy(productId, quantity); return this.getSnapshot(); }
  sell(productId: string, quantity: number) { this.engine.sell(productId, quantity); return this.getSnapshot(); }
}
