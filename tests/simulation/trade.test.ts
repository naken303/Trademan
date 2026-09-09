import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  Market,
  Product,
  SimulationState,
} from "../../src/shared/types";

import {
  buy,
  sell,
} from "../../src/simulation/systems/trade-system";

const product: Product = {
  id: "VEG",
  name: "Vegetable",
  unitsPerCrate: 20,
};

const supply: Market = {
  id: "M1",
  villageId: "A",
  productId: "VEG",
  side: "supply",
  unitPrice: 12,
  initialQuantity: 16,
};

const demand: Market = {
  id: "M2",
  villageId: "D",
  productId: "VEG",
  side: "demand",
  unitPrice: 20,
  initialQuantity: 20,
};

function createState(): SimulationState {
  return {
    time: {
      day: 1,
      hour: 0,
    },

    player: {
      location: "A",
      money: 1000,
      inventory: [],
      inventoryCost: {},
    },

    villages: {
      A: {
        initialReserveMoney: 500,
        initialMarkets: {
          M1: {
            quantity: 16,
          },
        },
        money: 500,
        reset: {
          current: {
            days: 1,
            hours: 0,
          },
        },
        resetAfterReset: {
          days: 1,
          hours: 0,
        },
        markets: {
          M1: {
            quantity: 16,
          },
        },
      },

      D: {
        initialReserveMoney: 500,
        initialMarkets: {
          M2: {
            quantity: 20,
          },
        },
        money: 500,
        reset: {
          current: {
            days: 1,
            hours: 0,
          },
        },
        resetAfterReset: {
          days: 1,
          hours: 0,
        },
        markets: {
          M2: {
            quantity: 20,
          },
        },
      },
    },

    accumulatedProfit: 0,
  };
}

describe("Trade System", () => {
  it("buys from supply", () => {
    const state = buy(
      createState(),
      [supply, demand],
      [product],
      "VEG",
      10,
      20,
    );

    expect(
      state.player.money,
    ).toBe(880);

    expect(
      state.player.inventory,
    ).toEqual([
      {
        productId: "VEG",
        quantity: 10,
      },
    ]);

    expect(
      state.villages.A.money,
    ).toBe(620);

    expect(
      state.villages.A.markets.M1
        .quantity,
    ).toBe(6);
  });

  it("sells to demand and calculates profit", () => {
    let state = buy(
      createState(),
      [supply, demand],
      [product],
      "VEG",
      10,
      20,
    );

    state = {
      ...state,
      player: {
        ...state.player,
        location: "D",
      },
    };

    state = sell(
      state,
      [supply, demand],
      "VEG",
      10,
    );

    expect(
      state.player.money,
    ).toBe(1080);

    expect(
      state.player.inventory,
    ).toEqual([]);

    expect(
      state.accumulatedProfit,
    ).toBe(80);

    expect(
      state.villages.D.money,
    ).toBe(300);
  });

  it("preserves the remaining cost basis across partial sales", () => {
    let state = buy(
      createState(),
      [supply, demand],
      [product],
      "VEG",
      10,
      20,
    );

    state = {
      ...state,
      player: {
        ...state.player,
        location: "D",
      },
    };

    state = sell(state, [supply, demand], "VEG", 4);

    expect(state.player.inventory).toEqual([
      { productId: "VEG", quantity: 6 },
    ]);
    expect(state.player.inventoryCost).toEqual({ VEG: 72 });
    expect(state.accumulatedProfit).toBe(32);

    state = sell(state, [supply, demand], "VEG", 6);

    expect(state.player.inventory).toEqual([]);
    expect(state.player.inventoryCost).toEqual({});
    expect(state.accumulatedProfit).toBe(80);
  });
});
