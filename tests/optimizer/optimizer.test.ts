import { describe, expect, it } from "vitest";
import type { Market, Route, SimulationState, WorldData } from "../../src/shared/types";
import { SimulationEngine, createInitialSimulationState } from "../../src/simulation";
import { compactOptimizerPlan, compareForResult, createOptimizerStateSignature, runOptimizer } from "../../src/optimizer";
import { exactTinyMaximumProfit, materialState, replayAndExpectResult } from "./optimizer-test-helpers";

function world(options: {
  routes?: Route[];
  markets?: Market[];
  capacity?: number;
  money?: number;
  currentVillageId?: string;
  continuousMode?: boolean;
} = {}): WorldData {
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
      reset: { afterReset: { days: 1, hours: 0 } },
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
  it("combines consecutive same-village product trades for the returned plan", () => {
    const plan = compactOptimizerPlan([
      { action: { type: "buy", productId: "P", quantity: 11 }, villageId: "A", time: { day: 1, hour: 0 }, playerMoney: 78, accumulatedProfit: 0 },
      { action: { type: "buy", productId: "P", quantity: 4 }, villageId: "A", time: { day: 1, hour: 0 }, playerMoney: 70, accumulatedProfit: 0 },
      { action: { type: "travel", destinationId: "B" }, villageId: "B", time: { day: 1, hour: 2 }, playerMoney: 70, accumulatedProfit: 0 },
    ]);
    expect(plan).toHaveLength(2);
    expect(plan[0].action).toEqual({ type: "buy", productId: "P", quantity: 15 });
    expect(plan[0]).toMatchObject({ time: { day: 1, hour: 0 }, playerMoney: 70 });
  });
  it("continues past ordinary search limits until a configured profit target is reached", () => {
    const result = runOptimizer(world(), { targetProfit: 60, maxSteps: 1, maxExpandedStates: 1 });
    expect(result.accumulatedProfit).toBeGreaterThanOrEqual(60);
    expect(result.statistics.terminationReason).toBe("targetProfit");
    replayAndExpectResult(world(), result);
  });
  it("finds a profitable direct buy, travel, and sell plan", () => {
    const result = runOptimizer(world());
    expect(result.accumulatedProfit).toBeGreaterThan(0);
    expect(result.plan.map((step) => step.action.type)).toEqual(expect.arrayContaining(["buy", "travel", "sell"]));
    expect(result.statistics.expandedStates).toBeGreaterThan(0);
    replayAndExpectResult(world(), result);
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
    const input = world();
    const result = runOptimizer(input, { villageResetRemaining: Object.fromEntries(input.villages.map((village) => [village.id, { days: 0, hours: 1 }])) });
    expect(result.accumulatedProfit).toBeGreaterThan(0);
    expect(result.finalState.villages.A.reset.current).toEqual({ days: 0, hours: 23 });
    expect(result.finalState.villages.B.reset.current).toEqual({ days: 0, hours: 23 });
    expect(result.finalState.villages.C.reset.current).toEqual({ days: 0, hours: 23 });
    expect(result.finalState.villages.A.markets["A-P-S"]?.quantity).toBe(20);
    expect(result.finalState.villages.A.money).toBe(1000);
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

  it("is deterministic except for elapsed timing and independent of market ordering", () => {
    const input = world();
    const reordered = { ...input, markets: [...input.markets].reverse(), products: [...input.products].reverse(), villages: [...input.villages].reverse() };
    const first = runOptimizer(input);
    const second = runOptimizer(input);
    const reorderedResult = runOptimizer(reordered);
    expect(first.plan).toEqual(second.plan);
    expect(materialState(first.finalState)).toEqual(materialState(second.finalState));
    expect({ ...first.statistics, elapsedMs: 0 }).toEqual({ ...second.statistics, elapsedMs: 0 });
    expect(reorderedResult.plan).toEqual(first.plan);
    expect(materialState(reorderedResult.finalState)).toEqual(materialState(first.finalState));
  });

  it("distinguishes every future-affecting signature field but ignores world visuals", () => {
    const input = world();
    const state = createInitialSimulationState(input);
    const base = createOptimizerStateSignature(state);
    const changes: SimulationState[] = [
      { ...state, player: { ...state.player, location: "B" } },
      { ...state, player: { ...state.player, money: state.player.money + 1 } },
      { ...state, player: { ...state.player, inventory: [{ productId: "P", quantity: 1 }] } },
      { ...state, player: { ...state.player, inventoryCost: { P: 1 } } },
      { ...state, time: { ...state.time, hour: 1 } },
      { ...state, accumulatedProfit: 1 },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, money: 999 } } },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, reset: { current: { days: 0, hours: 1 } } } } },
      { ...state, villages: { ...state.villages, A: { ...state.villages.A, markets: { ...state.villages.A.markets, "A-P-S": { quantity: 1 } } } } },
    ];
    for (const changed of changes) expect(createOptimizerStateSignature(changed)).not.toBe(base);
    const visuallyChanged = { ...input, villages: input.villages.map((village) => ({ ...village, name: `Visual ${village.name}`, position: { x: 999, y: 999 } })) };
    expect(createOptimizerStateSignature(createInitialSimulationState(visuallyChanged))).toBe(base);
  });

  it("carries separate product crates for a better accumulated-profit sequence", () => {
    const input = world({ capacity: 2, money: 40, routes: [
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } },
      { id: "B-C", from: "B", to: "C", travelTime: { days: 0, hours: 1 } },
    ], markets: [
      { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 },
      { id: "A-Q-S", villageId: "A", productId: "Q", side: "supply", unitPrice: 2, initialQuantity: 10 },
      { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 10 },
      { id: "C-Q-D", villageId: "C", productId: "Q", side: "demand", unitPrice: 7, initialQuantity: 10 },
    ] });
    input.products.push({ id: "Q", name: "Second", unitsPerCrate: 10 });
    input.optimization = { periodDays: 1, beamWidth: 500, maxSteps: 6 };
    const result = runOptimizer(input, { maxExpandedStates: 10_000 });
    expect(result.accumulatedProfit).toBe(80);
    expect(result.plan.filter((step) => step.action.type === "buy").map((step) => step.action.type === "buy" ? step.action.productId : "")).toEqual(expect.arrayContaining(["P", "Q"]));
  });

  it("replays initial inventory cost basis and zero-cost legacy behavior", () => {
    for (const unitCost of [3, 0]) {
      const input = world({ currentVillageId: "B", markets: [{ id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 4 }] });
      input.player.initialInventory = [{ productId: "P", quantity: 4, unitCost }];
      const result = runOptimizer(input);
      expect(result.accumulatedProfit).toBe((5 - unitCost) * 4);
      replayAndExpectResult(input, result);
    }
  });

  it("honors explicit reverse duration over fallback and replays multi-reset travel", () => {
    const input = world({ currentVillageId: "B", routes: [
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 }, reverseTravelTime: { days: 2, hours: 2 } },
    ], markets: [{ id: "A-P-D", villageId: "A", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 4 }] });
    input.player.initialInventory = [{ productId: "P", quantity: 4, unitCost: 2 }];
    input.optimization = { periodDays: 3, beamWidth: 50, maxSteps: 3 };
    const result = runOptimizer(input, { villageResetRemaining: Object.fromEntries(input.villages.map((village) => [village.id, { days: 0, hours: 2 }])) });
    expect(result.plan[0].action).toEqual({ type: "travel", destinationId: "A" });
    expect(result.finalState.time).toEqual({ day: 3, hour: 2 });
    expect(result.finalState.villages.A.reset.current).toEqual({ days: 1, hours: 0 });
    expect(result.finalState.villages.B.reset.current).toEqual({ days: 1, hours: 0 });
    expect(result.finalState.villages.A.markets["A-P-D"]?.quantity).toBe(0);
    expect(result.finalState.villages.A.money).toBe(980);
  });

  it("terminates cyclic searches within configured beam and expansion limits", () => {
    const input = world({ routes: [
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } },
      { id: "B-C", from: "B", to: "C", travelTime: { days: 0, hours: 1 } },
      { id: "C-A", from: "C", to: "A", travelTime: { days: 0, hours: 1 } },
    ], markets: [] });
    const result = runOptimizer(input, { periodDays: 30, beamWidth: 7, maxSteps: 100, maxExpandedStates: 40 });
    expect(result.statistics.expandedStates).toBeLessThanOrEqual(40);
    expect(result.statistics.maxFrontierSize).toBeLessThanOrEqual(7);
    expect(result.plan).toEqual([]);
  });

  it("matches a tiny exhaustive reference when the beam is sufficiently wide", () => {
    const input = world({ capacity: 1, money: 4, markets: [
      { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 2 },
      { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 2 },
    ] });
    input.optimization = { periodDays: 1, beamWidth: 100, maxSteps: 3 };
    expect(runOptimizer(input).accumulatedProfit).toBe(exactTinyMaximumProfit(input, 3, 2));
  });

  it("keeps a deterministic profitable result within medium search bounds", () => {
    const input = world({ capacity: 3, money: 100, routes: [
      { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 2 } },
      { id: "B-C", from: "B", to: "C", travelTime: { days: 0, hours: 3 } },
      { id: "C-A", from: "C", to: "A", travelTime: { days: 0, hours: 4 } },
    ] });
    input.products.push({ id: "Q", name: "Second", unitsPerCrate: 5 });
    input.markets.push(
      { id: "A-Q-S", villageId: "A", productId: "Q", side: "supply", unitPrice: 3, initialQuantity: 10 },
      { id: "C-Q-D", villageId: "C", productId: "Q", side: "demand", unitPrice: 9, initialQuantity: 10 },
    );
    const options = { periodDays: 2, beamWidth: 80, maxSteps: 12, maxExpandedStates: 800 };
    const first = runOptimizer(input, options); const second = runOptimizer(input, options);
    expect(first.accumulatedProfit).toBeGreaterThan(0);
    expect(first.plan).toEqual(second.plan);
    expect(first.statistics.expandedStates).toBeLessThanOrEqual(options.maxExpandedStates);
    expect(first.statistics.maxFrontierSize).toBeLessThanOrEqual(options.beamWidth);
    replayAndExpectResult(input, first);
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
