import type {
  Market,
  Product,
  SimulationState,
} from "../../shared/types";

import {
  findMarket,
} from "../../domain/market";

import {
  addToInventory,
  removeFromInventory,
} from "./inventory-system";

export function buy(
  state: SimulationState,
  markets: Market[],
  products: Product[],
  productId: string,
  quantity: number,
  inventoryCapacityCrates: number,
): SimulationState {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    throw new Error(
      "Buy quantity must be a positive integer",
    );
  }

  const village =
    state.villages[
      state.player.location
    ];

  if (!village) {
    throw new Error(
      "Current village does not exist",
    );
  }

  const market = findMarket(
    markets,
    state.player.location,
    productId,
    "supply",
  );

  if (!market) {
    throw new Error(
      "Supply market does not exist",
    );
  }

  const runtimeMarket =
    village.markets[market.id];

  if (!runtimeMarket) {
    throw new Error(
      "Runtime market does not exist",
    );
  }

  if (
    quantity >
    runtimeMarket.quantity
  ) {
    throw new Error(
      "Not enough supply",
    );
  }

  const product =
    products.find(
      (item) =>
        item.id === productId,
    );

  if (!product) {
    throw new Error(
      `Unknown product: ${productId}`,
    );
  }

  const totalCost =
    market.unitPrice * quantity;

  if (
    state.player.money <
    totalCost
  ) {
    throw new Error(
      "Insufficient player money",
    );
  }

  const nextInventory =
    addToInventory(
      state.player.inventory,
      product,
      quantity,
      products,
      inventoryCapacityCrates,
    );

  const previousCost =
    state.player.inventoryCost[
      productId
    ] ?? 0;
  
  const nextInventoryCost = {
    ...state.player.inventoryCost,
  
    [productId]:
      previousCost +
      totalCost,
  };

  const nextVillage = {
    ...village,

    money:
      village.money + totalCost,

    markets: {
      ...village.markets,

      [market.id]: {
        quantity:
          runtimeMarket.quantity -
          quantity,
      },
    },
  };

  return {
    ...state,

    player: {
      ...state.player,

      money:
        state.player.money -
        totalCost,

      inventory:
        nextInventory,
      
      inventoryCost:
        nextInventoryCost,
    },

    villages: {
      ...state.villages,

      [villageId(state)]: nextVillage,
    },
  };
}

export function sell(
  state: SimulationState,
  markets: Market[],
  productId: string,
  quantity: number,
): SimulationState {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    throw new Error(
      "Sell quantity must be a positive integer",
    );
  }

  const village =
    state.villages[
      state.player.location
    ];

  if (!village) {
    throw new Error(
      "Current village does not exist",
    );
  }

  const market = findMarket(
    markets,
    state.player.location,
    productId,
    "demand",
  );

  if (!market) {
    throw new Error(
      "Demand market does not exist",
    );
  }

  const runtimeMarket =
    village.markets[market.id];

  if (!runtimeMarket) {
    throw new Error(
      "Runtime market does not exist",
    );
  }

  if (
    quantity >
    runtimeMarket.quantity
  ) {
    throw new Error(
      "Village demand is insufficient",
    );
  }

  const inventoryQuantity =
    state.player.inventory.find(
      (item) =>
        item.productId === productId,
    )?.quantity ?? 0;
  
  if (
    inventoryQuantity < quantity
  ) {
    throw new Error(
      "Insufficient inventory",
    );
  }
  
  const totalInventoryCost =
    state.player.inventoryCost[
      productId
    ] ?? 0;
  
  const averageCost =
    totalInventoryCost /
    inventoryQuantity;
  
  const soldCost =
    averageCost * quantity;

  const nextInventory =
    removeFromInventory(
      state.player.inventory,
      productId,
      quantity,
    );

  const remainingCost =
    Math.max(
      0,
      totalInventoryCost -
        soldCost,
    );
  
  const nextInventoryCost = {
    ...state.player.inventoryCost,
  };
  
  if (remainingCost === 0) {
    delete nextInventoryCost[
      productId
    ];
  } else {
    nextInventoryCost[
      productId
    ] = remainingCost;
  }

  const revenue =
    market.unitPrice * quantity;

  const profit =
    revenue - soldCost;

  if (village.money < revenue) {
    throw new Error(
      "Village does not have enough money",
    );
  }

  const nextVillage = {
    ...village,

    money:
      village.money - revenue,

    markets: {
      ...village.markets,

      [market.id]: {
        quantity:
          runtimeMarket.quantity -
          quantity,
      },
    },
  };

  return {
    ...state,

    player: {
      ...state.player,

      money:
        state.player.money +
        revenue,

      inventory:
        nextInventory,

      inventoryCost:
        nextInventoryCost,
    },

    villages: {
      ...state.villages,

      [villageId(state)]: nextVillage,
    },

    accumulatedProfit:
      state.accumulatedProfit +
      profit,
  };
}

function villageId(
  state: SimulationState,
): string {
  return state.player.location;
}
