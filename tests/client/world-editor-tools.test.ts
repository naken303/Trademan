import { describe, expect, it } from "vitest";
import type { WorldData } from "../../src/shared/types";
import {
  getMarketAssignmentDraft,
  normalizeProductPaletteMode,
} from "../../src/client/features/world/world-editor-model";

function world(): WorldData {
  return {
    schemaVersion: 1,
    settings: { currency: "THB" },
    player: { currentVillageId: "A", money: 100, inventoryCapacityCrates: 5, continuousMode: false, initialInventory: [] },
    simulation: { startDay: 1, startHour: 0 },
    optimization: { periodDays: 1, beamWidth: 10, maxSteps: 10 },
    products: [{ id: "P", name: "Product", unitsPerCrate: 10, baseSupplyPrice: 20, baseDemandPrice: 28 }],
    villages: [{ id: "A", name: "A", position: { x: 0, y: 0 }, initialReserveMoney: 100, reset: { current: { days: 1, hours: 0 }, afterReset: { days: 1, hours: 0 } } }],
    routes: [],
    markets: [],
  };
}

describe("World editor product defaults", () => {
  it("uses the side-specific product default for a new market", () => {
    const input = world();
    expect(getMarketAssignmentDraft(input, "A", "P", "supply")).toEqual({ price: "20", quantity: "" });
    expect(getMarketAssignmentDraft(input, "A", "P", "demand")).toEqual({ price: "28", quantity: "" });
  });

  it("prefers each persisted market price and quantity over changed defaults", () => {
    const input = world();
    input.markets = [
      { id: "S", villageId: "A", productId: "P", side: "supply", unitPrice: 22, initialQuantity: 4 },
      { id: "D", villageId: "A", productId: "P", side: "demand", unitPrice: 30, initialQuantity: 6 },
    ];
    input.products[0] = { ...input.products[0]!, baseSupplyPrice: 25, baseDemandPrice: 35 };
    expect(getMarketAssignmentDraft(input, "A", "P", "supply")).toEqual({ price: "22", quantity: "4" });
    expect(getMarketAssignmentDraft(input, "A", "P", "demand")).toEqual({ price: "30", quantity: "6" });
  });

  it("leaves price empty without the applicable product default", () => {
    const input = world();
    input.products[0] = { id: "P", name: "Product", unitsPerCrate: 10, baseSupplyPrice: 20 };
    expect(getMarketAssignmentDraft(input, "A", "P", "demand").price).toBe("");
  });

  it("falls back safely for invalid palette preferences", () => {
    expect(normalizeProductPaletteMode("details")).toBe("details");
    expect(normalizeProductPaletteMode("invalid")).toBe("images");
    expect(normalizeProductPaletteMode(null)).toBe("images");
  });
});
