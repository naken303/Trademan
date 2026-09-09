import { describe, expect, it } from "vitest";
import type { Market, Route, SimulationState, WorldData } from "../../src/shared/types";
import { SimulationEngine, createInitialSimulationState } from "../../src/simulation";
import { compareForResult, createOptimizerStateSignature, runOptimizer } from "../../src/optimizer";

function world(options: {
  routes?: Route[];
  markets?: Market[];
  capacity?: number;
  money?: number;
  currentVillageId?: string;
  continuousMode?: boolean;
  resetHours?: number;
} = {}): WorldData {
  const resetHours = options.resetHours ?? 12;
  return {
    schemaVersion: 1,
    settings: { currency: "G" },
    player: {
      currentVillageId: options.currentVillageId ?? "A",
      money: options.money ?? 100,
      inventoryCapacityCrates: options.capacity ?? 2,
      continuousMode: options.continuousMode ?? false,
      initialInventory: [],
    },
    simulation: { startDay: 1, startHour: 0 },
    optimization: { periodDays: 2, beamWidth: 120, maxSteps: 8 },
    products: [{ id: "P", name: "Product", unitsPerCrate: 10 }],
    villages: ["A", "B", "C"].map((id, index) => ({
      id, name: id, position: { x: index, y: 0 }, initialReserveMoney: 1000,
      reset: { current: { days: 0, hours: resetHours }, afterReset: { days: 1, hours: 0 } },
    })),
    routes: options.routes ?? [{ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 } }],
    markets: options.markets ?? [
      { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 20 },
      { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 20 },
    ],
  };
}

function replay(input: WorldData, actions: ReturnType<typeof runOptimizer>["plan"]) {
  const engine = new SimulationEngine(createInitialSimulationState(input), input.products, input.routes, input.markets, input.player.inventoryCapacityCrates);
  const snapshots: Array<{ state: SimulationState; crates: number }> = [];
  for (const { action } of actions) {
    const state = action.type === "buy" ? engine.buy(action.productId, action.quantity)
      : action.type === "sell" ? engine.sell(action.productId, action.quantity)
        : engine.travel(action.destinationId);
    snapshots.push({ state, crates: engine.getUsedInventoryCrates() });
  }
  return snapshots;
}

describe("optimizer core", () => {
  it("finds a profitable direct buy, travel, and sell plan", () => {
    const result = runOptimizer(world());
    expect(result.accumulatedProfit).toBeGreaterThan(0);
    expect(result.plan.map((step) => step.action.type)).toEqual(expect.arrayContaining(["buy", "travel", "sell"]));
    expect(result.statistics.expandedStates).toBeGreaterThan(0);
  });

  it("discovers a profitable destination through an intermediate village", () => {
    const input = world({
      routes: [
        { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 } },
        { id: "B-C", from: "B", to: "C", travelTime: { days: 0, hours: 2 } },
      ],
      markets: [
        { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 },
        { id: "C-P-D", villageId: "C", productId: "P", side: "demand", unitPrice: 8, initialQuantity: 10 },
      ],
    });
    const result = runOptimizer(input);
    expect(result.accumulatedProfit).toBe(60);
    expect(result.plan.filter((step) => step.action.type === "travel").map((step) => step.villageId)).toEqual(["B", "C"]);
  });

  it("never exceeds crate capacity", () => {
    const input = world({ capacity: 1, money: 1000 });
    const result = runOptimizer(input);
    expect(replay(input, result.plan).every((snapshot) => snapshot.crates <= 1)).toBe(true);
  });

  it("never purchases beyond available cash", () => {
    const input = world({ money: 5, capacity: 10 });
    const result = runOptimizer(input);
    const engine = new SimulationEngine(createInitialSimulationState(input), input.products, input.routes, input.markets, input.player.inventoryCapacityCrates);
    for (const { action } of result.plan) {
      if (action.type === "buy") {
        expect(action.quantity * 2).toBeLessThanOrEqual(engine.getState().player.money);
        engine.buy(action.productId, action.quantity);
      } else if (action.type === "sell") engine.sell(action.productId, action.quantity);
      else engine.travel(action.destinationId);
      expect(engine.getState().player.money).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses engine reset behavior when travel crosses a reset boundary", () => {
    const input = world({ resetHours: 1 });
    const result = runOptimizer(input);
    expect(result.accumulatedProfit).toBeGreaterThan(0);
    expect(result.finalState.villages.B.reset.current).toEqual({ days: 0, hours: 23 });
    expect(result.finalState.villages.B.markets["B-P-D"]?.quantity).toBeLessThan(20);
    expect(result.finalState.villages.B.money).toBeLessThan(1000);
  });

  it("uses reverse-route fallback", () => {
    const input = world({
      currentVillageId: "B",
      routes: [{ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 3 } }],
      markets: [
        { id: "B-P-S", villageId: "B", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 },
        { id: "A-P-D", villageId: "A", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 10 },
      ],
    });
    const result = runOptimizer(input);
    expect(result.accumulatedProfit).toBe(30);
    expect(result.plan.some((step) => step.action.type === "travel" && step.action.destinationId === "A")).toBe(true);
  });

  it("creates stable signatures and distinguishes material runtime state", () => {
    const state = createInitialSimulationState(world());
    expect(createOptimizerStateSignature(state)).toBe(createOptimizerStateSignature(structuredClone(state)));
    for (const changed of [
      { ...state, player: { ...state.player, inventory: [{ productId: "P", quantity: 1 }] } },
      { ...state, player: { ...state.player, inventoryCost: { P: 1 } } },
      { ...state, time: { day: 1, hour: 1 } },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, money: 999 } } },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, reset: { current: { days: 0, hours: 1 } } } } },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, markets: { ...state.villages.A.markets, "A-P-S": { quantity: 1 } } } } },
    ]) expect(createOptimizerStateSignature(changed)).not.toBe(createOptimizerStateSignature(state));
  });

  it("prioritizes higher realized profit over a more continuous lower-profit path", () => {
    const input = world({
      continuousMode: true,
      routes: [
        { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } },
        { id: "A-C", from: "A", to: "C", travelTime: { days: 0, hours: 2 } },
      ],
      markets: [
        { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 },
        { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 4, initialQuantity: 10 },
        { id: "C-P-D", villageId: "C", productId: "P", side: "demand", unitPrice: 8, initialQuantity: 10 },
      ],
    });
    expect(runOptimizer(input).accumulatedProfit).toBe(60);
    const initial = createInitialSimulationState(input);
    expect(compareForResult(input,
      { state: { ...initial, accumulatedProfit: 10 }, plan: [], tradeActions: 1, firstProfitStep: 1 },
      { state: { ...initial, accumulatedProfit: 9 }, plan: [], tradeActions: 100, firstProfitStep: 1 },
    )).toBeGreaterThan(0);
  });
});
