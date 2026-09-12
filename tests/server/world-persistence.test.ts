import { describe, expect, it } from "vitest";

import type { WorldData } from "../../src/shared/types";
import { worldDataSchema } from "../../src/shared/schemas";
import {
  createProductWithGeneratedId,
  getWorld,
  importWorld,
  initializeDatabase,
} from "../../src/server/database";

function createWorld(): WorldData {
  return {
    schemaVersion: 2,
    settings: { currency: "GOLD" },
    player: {
      currentVillageId: "A",
      money: 125,
      inventoryCapacityCrates: 4,
      continuousMode: true,
      initialInventory: [
        { productId: "WOOD", quantity: 3, unitCost: 4.5 },
      ],
    },
    simulation: { startDay: 3, startHour: 7 },
    optimization: { periodDays: 9, beamWidth: 12, maxSteps: 34 },
    products: [{ id: "WOOD", name: "Wood", unitsPerCrate: 10, baseSupplyPrice: 4.5, baseDemandPrice: 8 }],
    villages: [
      {
        id: "A",
        name: "Alpha",
        position: { x: 1, y: 2 },
        visual: { icon: "tree", image: "assets/villages/a.png" },
        initialReserveMoney: 75,
        reset: {
          afterReset: { days: 1, hours: 0 },
        },
      },
      {
        id: "B",
        name: "Beta",
        position: { x: 3, y: 4 },
        visual: { icon: null, image: null },
        initialReserveMoney: 50,
        reset: {
          afterReset: { days: 1, hours: 0 },
        },
      },
    ],
    routes: [],
    markets: [],
  };
}

describe("World persistence", () => {
  it("round-trips configurable world fields and village visuals", () => {
    initializeDatabase();
    const world = createWorld();

    importWorld(world);

    expect(getWorld()).toEqual(worldDataSchema.parse(world));
  });

  it("advances generated Product IDs beyond imported generated IDs", () => {
    initializeDatabase();
    const world = createWorld();
    world.products.push({ id: "P000042", name: "Imported", unitsPerCrate: 5 });

    importWorld(world);

    expect(createProductWithGeneratedId({ name: "Created later", unitsPerCrate: 5 }).id).toBe("P000043");
  });
});
