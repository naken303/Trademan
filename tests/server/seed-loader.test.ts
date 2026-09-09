import {
  describe,
  expect,
  it,
} from "vitest";

import {
  db,
  initializeDatabase,
  loadDemoWorld,
} from "../../src/server/database";

describe("Demo World Import", () => {
  it("imports the demo world into SQLite", () => {
    initializeDatabase();

    const world =
      loadDemoWorld();

    const villages =
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM villages",
        )
        .get() as {
          count: number;
        };

    const products =
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM products",
        )
        .get() as {
          count: number;
        };

    const routes =
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM routes",
        )
        .get() as {
          count: number;
        };

    const markets =
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM markets",
        )
        .get() as {
          count: number;
        };

    expect(world.villages).toHaveLength(4);
    expect(world.products).toHaveLength(4);
    expect(world.routes).toHaveLength(3);
    expect(world.markets).toHaveLength(5);

    expect(villages.count).toBe(4);
    expect(products.count).toBe(4);
    expect(routes.count).toBe(3);
    expect(markets.count).toBe(5);
  });

  it("imports the expected vegetable markets", () => {
    const supply =
      db
        .prepare(`
          SELECT
            village_id,
            unit_price,
            initial_quantity
          FROM markets
          WHERE id = 'A-VEG-S'
        `)
        .get() as {
          village_id: string;
          unit_price: number;
          initial_quantity: number;
        };

    const demand =
      db
        .prepare(`
          SELECT
            village_id,
            unit_price,
            initial_quantity
          FROM markets
          WHERE id = 'D-VEG-D'
        `)
        .get() as {
          village_id: string;
          unit_price: number;
          initial_quantity: number;
        };

    expect(supply).toEqual({
      village_id: "A",
      unit_price: 12,
      initial_quantity: 16,
    });

    expect(demand).toEqual({
      village_id: "D",
      unit_price: 20,
      initial_quantity: 20,
    });
  });
});