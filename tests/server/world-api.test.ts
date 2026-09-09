import {
  describe,
  expect,
  it,
} from "vitest";

import {
  initializeDatabase,
  loadDemoWorld,
  getWorld,
} from "../../src/server/database";

describe("World API data source", () => {
  it("returns the complete world from SQLite", () => {
    initializeDatabase();

    loadDemoWorld();

    const world =
      getWorld();

    expect(
      world.schemaVersion,
    ).toBe(1);

    expect(
      world.player.currentVillageId,
    ).toBe("A");

    expect(
      world.products,
    ).toHaveLength(4);

    expect(
      world.villages,
    ).toHaveLength(4);

    expect(
      world.routes,
    ).toHaveLength(3);

    expect(
      world.markets,
    ).toHaveLength(5);
  });
});