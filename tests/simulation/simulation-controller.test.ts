import { describe, expect, it } from "vitest";
import type { WorldData } from "../../src/shared/types";
import { SimulationController } from "../../src/client/features/simulator/simulation-controller";

const world: WorldData = {
  schemaVersion: 1,
  settings: { currency: "gold" },
  player: { currentVillageId: "farm", money: 100, inventoryCapacityCrates: 2, continuousMode: false, initialInventory: [] },
  simulation: { startDay: 1, startHour: 8 },
  optimization: { periodDays: 10, beamWidth: 10, maxSteps: 20 },
  products: [{ id: "grain", name: "Grain", unitsPerCrate: 10 }],
  villages: [
    { id: "farm", name: "Farm", position: { x: 0, y: 0 }, initialReserveMoney: 100,
      reset: { afterReset: { days: 1, hours: 0 } } },
    { id: "town", name: "Town", position: { x: 1, y: 1 }, initialReserveMoney: 200,
      reset: { afterReset: { days: 1, hours: 0 } } },
  ],
  routes: [{ id: "farm-town", from: "farm", to: "town", travelTime: { days: 0, hours: 3 } }],
  markets: [
    { id: "farm-grain", villageId: "farm", productId: "grain", side: "supply", unitPrice: 5, initialQuantity: 10 },
    { id: "town-grain", villageId: "town", productId: "grain", side: "demand", unitPrice: 8, initialQuantity: 10 },
  ],
};
const initialization = { villageResetRemaining: { farm: { days: 1, hours: 0 }, town: { days: 0, hours: 2 } } };

describe("SimulationController", () => {
  it("runs initialize -> buy -> travel -> sell and refreshes its snapshot", () => {
    const controller = new SimulationController(world, initialization);
    expect(controller.getSnapshot().currentVillage.id).toBe("farm");
    expect(controller.buy("grain", 10).usedInventoryCrates).toBe(1);

    const arrived = controller.travel("town");
    expect(arrived.currentVillage.id).toBe("town");
    expect(arrived.state.time).toEqual({ day: 1, hour: 11 });
    expect(arrived.currentVillageReset).toEqual({ days: 0, hours: 23 });

    const sold = controller.sell("grain", 10);
    expect(sold.state.player.money).toBe(130);
    expect(sold.state.accumulatedProfit).toBe(30);
    expect(sold.usedInventoryCrates).toBe(0);
  });

  it("lists reverse travel through the domain fallback", () => {
    const controller = new SimulationController(world, initialization);
    controller.travel("town");
    expect(controller.getSnapshot().destinations).toEqual([
      expect.objectContaining({ village: expect.objectContaining({ id: "farm" }), travelTime: { days: 0, hours: 3 } }),
    ]);
  });
});
