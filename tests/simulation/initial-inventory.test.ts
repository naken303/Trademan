import { describe, expect, it } from "vitest";

import type { WorldData } from "../../src/shared/types";
import { createInitialSimulationState } from "../../src/simulation";
import { sell } from "../../src/simulation/systems/trade-system";

function createWorld(): WorldData {
  return {
    schemaVersion: 1,
    settings: { currency: "GOLD" },
    player: {
      currentVillageId: "A",
      money: 0,
      inventoryCapacityCrates: 10,
      continuousMode: false,
      initialInventory: [
        { productId: "WOOD", quantity: 10, unitCost: 20 },
        { productId: "STONE", quantity: 5, unitCost: 0 },
      ],
    },
    simulation: { startDay: 1, startHour: 0 },
    optimization: { periodDays: 1, beamWidth: 1, maxSteps: 1 },
    products: [
      { id: "WOOD", name: "Wood", unitsPerCrate: 10 },
      { id: "STONE", name: "Stone", unitsPerCrate: 10 },
    ],
    villages: [
      {
        id: "A",
        name: "Alpha",
        position: { x: 0, y: 0 },
        initialReserveMoney: 1000,
        reset: {
          current: { days: 1, hours: 0 },
          afterReset: { days: 1, hours: 0 },
        },
      },
    ],
    routes: [],
    markets: [
      {
        id: "WOOD-D",
        villageId: "A",
        productId: "WOOD",
        side: "demand",
        unitPrice: 30,
        initialQuantity: 10,
      },
      {
        id: "STONE-D",
        villageId: "A",
        productId: "STONE",
        side: "demand",
        unitPrice: 2,
        initialQuantity: 5,
      },
    ],
  };
}

describe("Initial inventory accounting", () => {
  it("initializes multiple products with explicit total cost basis", () => {
    const state = createInitialSimulationState(createWorld());

    expect(state.player.inventoryCost).toEqual({
      WOOD: 200,
      STONE: 0,
    });
  });

  it("tracks partial and full sales without stale cost", () => {
    const world = createWorld();
    let state = createInitialSimulationState(world);

    state = sell(state, world.markets, "WOOD", 4);
    expect(state.player.inventoryCost.WOOD).toBe(120);
    expect(state.accumulatedProfit).toBe(40);

    state = sell(state, world.markets, "WOOD", 3);
    expect(state.player.inventoryCost.WOOD).toBe(60);
    expect(state.accumulatedProfit).toBe(70);

    state = sell(state, world.markets, "WOOD", 3);
    expect(state.player.inventoryCost).toEqual({ STONE: 0 });
    expect(state.accumulatedProfit).toBe(100);

    state = sell(state, world.markets, "STONE", 5);
    expect(state.player.inventoryCost).toEqual({});
    expect(state.accumulatedProfit).toBe(110);
  });
});
