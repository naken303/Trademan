import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { worldDataSchema } from "../../src/shared/schemas";
import type { WorldData } from "../../src/shared/types";
import { SimulationController } from "../../src/client/features/simulator/simulation-controller";

function demoWorld(): WorldData {
  return worldDataSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "database/seed/demo-world.json"), "utf8")));
}

function routeWorld(routes: WorldData["routes"]): WorldData {
  const world = demoWorld();
  return { ...world, routes, markets: [] };
}
const demoReset = (world: WorldData, hours = 12) => ({ villageResetRemaining: Object.fromEntries(world.villages.map((village) => [village.id, { days: 0, hours }])) });

describe("full core simulation scenarios", () => {
  it("preserves money, crates, reset time, reserve, realized profit, and partial cost basis", () => {
    const world = demoWorld();
    const controller = new SimulationController(world, demoReset(world));
    const initial = controller.getSnapshot();
    expect(initial.currentVillage.id).toBe("A");
    expect(initial.state.player.money).toBe(1000);

    const bought = controller.buy("VEG", 10);
    expect(bought.state.player.money).toBe(880);
    expect(bought.state.player.inventory).toContainEqual({ productId: "VEG", quantity: 10 });
    expect(bought.state.player.inventoryCost.VEG).toBe(120);
    expect(bought.usedInventoryCrates).toBe(1);
    expect(bought.currentVillageMoney).toBe(1120);

    controller.travel("B");
    const arrived = controller.travel("D");
    expect(arrived.state.time).toEqual({ day: 1, hour: 9 });
    expect(arrived.currentVillageReset).toEqual({ days: 0, hours: 3 });

    const sold = controller.sell("VEG", 5);
    expect(sold.currentVillageMoney).toBe(900);
    expect(sold.state.player.money).toBe(980);
    expect(sold.state.accumulatedProfit).toBe(40);
    expect(sold.state.player.inventory).toContainEqual({ productId: "VEG", quantity: 5 });
    expect(sold.state.player.inventoryCost.VEG).toBe(60);
  });

  it("resets supply, demand, and reserve when travel crosses the boundary", () => {
    const world = demoWorld();
    const resetWorld: WorldData = {
      ...world,
      villages: world.villages.map((village) => ({
        ...village,
        reset: { afterReset: { days: 1, hours: 0 } },
      })),
    };
    const controller = new SimulationController(resetWorld, demoReset(resetWorld, 2));
    controller.buy("VEG", 2);
    const arrived = controller.travel("C");
    expect(arrived.state.villages.A.money).toBe(1000);
    expect(arrived.state.villages.A.markets["A-VEG-S"]?.quantity).toBe(16);
    expect(arrived.state.villages.D.markets["D-VEG-D"]?.quantity).toBe(20);
    expect(arrived.state.villages.A.reset.current).toEqual({ days: 0, hours: 23 });
  });

  it("prefers direct routes, falls back to reverse routes, and honors explicit reverse overrides", () => {
    const fallbackWorld = routeWorld([
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 } },
    ]);
    const fallback = new SimulationController(fallbackWorld, demoReset(fallbackWorld));
    fallback.travel("B");
    expect(fallback.travel("A").state.time).toEqual({ day: 1, hour: 4 });

    const explicitWorld = routeWorld([
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 }, reverseTravelTime: { days: 0, hours: 5 } },
    ]);
    const explicit = new SimulationController(explicitWorld, demoReset(explicitWorld));
    expect(explicit.travel("B").state.time).toEqual({ day: 1, hour: 2 });
    expect(explicit.travel("A").state.time).toEqual({ day: 1, hour: 7 });
  });

  it("does not allow reverse fallback when a route explicitly has no return trip", () => {
    const oneWayWorld = routeWorld([
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 }, returnAvailable: false },
    ]);
    const controller = new SimulationController(oneWayWorld, demoReset(oneWayWorld));
    controller.travel("B");
    expect(() => controller.travel("A")).toThrow("No route from B to A");
    expect(controller.getSnapshot().destinations).toEqual([]);
  });
});
