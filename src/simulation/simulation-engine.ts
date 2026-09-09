import type {
  Market,
  Product,
  Route,
  SimulationState,
} from "../shared/types";

import { travel } from "./systems/travel-system";

import {
  addToInventory,
  removeFromInventory,
  getUsedCrates,
} from "./systems/inventory-system";

import {
  buy,
  sell,
} from "./systems/trade-system";

export class SimulationEngine {
  private state: SimulationState;

  private readonly products: Product[];

  private readonly routes: Route[];

  private readonly markets: Market[];

  private readonly inventoryCapacityCrates: number;

  constructor(
    initialState: SimulationState,
    products: Product[],
    routes: Route[],
    markets: Market[],
    inventoryCapacityCrates: number,
  ) {
    this.state = structuredClone(
      initialState,
    );

    this.products = structuredClone(
      products,
    );

    this.routes = structuredClone(
      routes,
    );

    this.markets = structuredClone(
      markets,
    );

    this.inventoryCapacityCrates =
      inventoryCapacityCrates;
  }

  getState(): SimulationState {
    return structuredClone(
      this.state,
    );
  }

  travel(
    destinationId: string,
  ): SimulationState {
    this.state = travel(
      this.state,
      this.routes,
      destinationId,
    );

    return this.getState();
  }

  addInventory(
    productId: string,
    quantity: number,
  ): SimulationState {
    const product =
      this.products.find(
        (item) =>
          item.id === productId,
      );

    if (!product) {
      throw new Error(
        `Unknown product: ${productId}`,
      );
    }

    this.state.player.inventory =
      addToInventory(
        this.state.player.inventory,
        product,
        quantity,
        this.products,
        this.inventoryCapacityCrates,
      );

    return this.getState();
  }

  removeInventory(
    productId: string,
    quantity: number,
  ): SimulationState {
    this.state.player.inventory =
      removeFromInventory(
        this.state.player.inventory,
        productId,
        quantity,
      );

    return this.getState();
  }

  getUsedInventoryCrates(): number {
    return getUsedCrates(
      this.state.player.inventory,
      this.products,
    );
  }

  buy(
    productId: string,
    quantity: number,
  ): SimulationState {
    this.state = buy(
      this.state,
      this.markets,
      this.products,
      productId,
      quantity,
      this.inventoryCapacityCrates,
    );
  
    return this.getState();
  }

  sell(
    productId: string,
    quantity: number,
  ): SimulationState {
    this.state = sell(
      this.state,
      this.markets,
      productId,
      quantity,
    );
  
    return this.getState();
  }

}