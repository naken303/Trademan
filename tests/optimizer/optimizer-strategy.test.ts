import { describe, expect, it } from "vitest";
import { createInitialSimulationState } from "../../src/simulation";
import { createOptimizerIntelligence, generateStrategicActions, OPTIMIZER_STRATEGY_PRESETS, resolveOptimizerStrategy, runOptimizer } from "../../src/optimizer";
import type { WorldData } from "../../src/shared/types";
import { materialState, replayAndExpectResult } from "./optimizer-test-helpers";

function fixture(maximum = 40): WorldData {
  return {
    schemaVersion: 1, settings: { currency: "G" },
    player: { currentVillageId: "A", money: 1_000, inventoryCapacityCrates: 10, continuousMode: true, initialInventory: [] },
    simulation: { startDay: 1, startHour: 0 }, optimization: { periodDays: 2, beamWidth: 100, maxSteps: 6 },
    products: [{ id: "P", name: "P", unitsPerCrate: 20 }],
    villages: ["A", "B", "C", "X"].map((id, index) => ({ id, name: id, position: { x: index, y: 0 }, initialReserveMoney: 10_000, reset: { afterReset: { days: 1, hours: 0 } } })),
    routes: [{ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } }, { id: "B-C", from: "B", to: "C", travelTime: { days: 0, hours: 1 } }, { id: "A-X", from: "A", to: "X", travelTime: { days: 0, hours: 1 }, returnAvailable: false }],
    markets: [{ id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: maximum }, { id: "C-P-D", villageId: "C", productId: "P", side: "demand", unitPrice: 5, initialQuantity: maximum }],
  };
}

function actions(input: WorldData, preset: "baseline" | "balanced" | "optimized" | "custom", overrides = {}) {
  return generateStrategicActions(createOptimizerIntelligence(input), createInitialSimulationState(input), Infinity, true, resolveOptimizerStrategy({ preset, ...overrides }));
}

describe("optimizer search strategies", () => {
  it("resolves centralized presets and independent custom flags", () => {
    expect(resolveOptimizerStrategy({ preset: "baseline" })).toMatchObject({ preset: "baseline", ...OPTIMIZER_STRATEGY_PRESETS.baseline });
    expect(resolveOptimizerStrategy({ preset: "balanced" })).toMatchObject({ preset: "balanced", ...OPTIMIZER_STRATEGY_PRESETS.balanced });
    expect(resolveOptimizerStrategy({ preset: "optimized" })).toMatchObject({ preset: "optimized", ...OPTIMIZER_STRATEGY_PRESETS.optimized });
    const custom = resolveOptimizerStrategy({ preset: "custom", smartTravelPruning: true });
    expect(custom).toMatchObject({ preset: "custom", smartTravelPruning: true, profitableBuyPruning: false, tradeChainScoring: false });
    expect(Object.isFrozen(custom)).toBe(true);
  });

  it.each([40, 60, 200])("keeps crate candidates bounded for a %i-unit market", (maximum) => {
    const input = fixture(maximum);
    const baseline = actions(input, "baseline").flatMap((action) => action.type === "buy" ? [action.quantity] : []);
    const crate = actions(input, "custom", { crateQuantityCandidates: true }).flatMap((action) => action.type === "buy" ? [action.quantity] : []);
    expect(crate).toEqual(expect.arrayContaining([20, maximum]));
    expect(crate.length).toBeLessThanOrEqual(4);
    if (maximum === 40) { expect(crate).toEqual([20, 40]); expect(baseline).toEqual(expect.arrayContaining([19, 21])); }
  });

  it("switches travel and profitable-buy pruning independently", () => {
    const input = fixture();
    input.player.initialInventory = [{ productId: "P", quantity: 20, unitCost: 2 }];
    const baseline = actions(input, "baseline");
    const travelOnly = actions(input, "custom", { smartTravelPruning: true });
    expect(baseline).toContainEqual({ type: "travel", destinationId: "X" });
    expect(travelOnly).toContainEqual({ type: "travel", destinationId: "B" });
    expect(travelOnly).not.toContainEqual({ type: "travel", destinationId: "X" });
    input.player.initialInventory = [];
    input.markets[1] = { ...input.markets[1], unitPrice: 2 };
    expect(actions(input, "baseline").some((action) => action.type === "buy")).toBe(true);
    expect(actions(input, "custom", { profitableBuyPruning: true }).some((action) => action.type === "buy")).toBe(false);
  });

  it("keeps reset-capable demand plausible and falls back when no strategic action exists", () => {
    const input = fixture();
    const state = createInitialSimulationState(input);
    state.villages.C.markets["C-P-D"].quantity = 0;
    state.villages.C.reset.current = { days: 0, hours: 1 };
    const strategy = resolveOptimizerStrategy({ preset: "optimized" });
    expect(generateStrategicActions(createOptimizerIntelligence(input), state, Infinity, true, strategy).some((action) => action.type === "buy")).toBe(true);
    input.markets = [];
    const noTrade = runOptimizer(input, { strategy: { preset: "optimized" }, maxSteps: 2 });
    expect(noTrade.statistics.strategicFallbackCount).toBeGreaterThan(0);
  });

  it("returns resolved metadata and legal deterministic results for every preset", () => {
    const input = fixture(20);
    const presets = ["baseline", "balanced", "optimized"] as const;
    const results = presets.map((preset) => runOptimizer(input, { strategy: { preset }, beamWidth: 150, maxSteps: 5, maxExpandedStates: 2_000 }));
    for (const [index, result] of results.entries()) {
      expect(result.options.strategy.preset).toBe(presets[index]);
      expect(result.accumulatedProfit).toBe(60);
      replayAndExpectResult(input, result);
    }
    const repeated = runOptimizer(input, { strategy: { preset: "optimized" }, beamWidth: 150, maxSteps: 5, maxExpandedStates: 2_000 });
    expect(repeated.plan).toEqual(results[2].plan);
    expect(materialState(repeated.finalState)).toEqual(materialState(results[2].finalState));
  });

  it("preserves target and Brake semantics", () => {
    const input = fixture(20);
    const target = runOptimizer(input, { strategy: { preset: "baseline" }, targetProfit: 60, maxSteps: 1, maxExpandedStates: 1 });
    expect(target.statistics.terminationReason).toBe("targetProfit");
    let checks = 0;
    const braked = runOptimizer(input, { strategy: { preset: "optimized" }, maxSteps: 50 }, { shouldBrake: () => ++checks > 2 });
    expect(braked.statistics.terminationReason).toBe("brake");
    replayAndExpectResult(input, braked);
  });
});
