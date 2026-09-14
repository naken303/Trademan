import { describe, expect, it } from "vitest";
import { runOptimizer } from "../../src/optimizer";
import type { WorldData } from "../../src/shared/types";
import { replayAndExpectResult } from "./optimizer-test-helpers";

function sparseWorld(): WorldData {
  const villages = Array.from({ length: 22 }, (_, index) => ({
    id: `V${String(index).padStart(2, "0")}`, name: `Village ${index}`,
    position: { x: 0, y: 0 }, initialReserveMoney: 10_000,
    reset: { afterReset: { days: 2, hours: 0 } },
  }));
  const routes = Array.from({ length: 22 }, (_, index) => ({
    id: `R${index}`, from: villages[index].id, to: villages[(index + 1) % villages.length].id,
    travelTime: { days: 0, hours: 1 },
  }));
  for (let index = 0; index < 9; index += 1) routes.push({
    id: `C${index}`, from: villages[index].id, to: villages[index + 11].id,
    travelTime: { days: 0, hours: 2 },
  });
  const products = Array.from({ length: 46 }, (_, index) => ({ id: `P${String(index).padStart(2, "0")}`, name: `Product ${index}`, unitsPerCrate: 10 }));
  const markets = products.slice(0, 6).flatMap((product, index) => [
    { id: `S${index}`, villageId: villages[index].id, productId: product.id, side: "supply" as const, unitPrice: 10 + index, initialQuantity: 20 },
    { id: `D${index}`, villageId: villages[index + 11].id, productId: product.id, side: "demand" as const, unitPrice: 25 + index, initialQuantity: 20 },
  ]);
  return {
    schemaVersion: 1, settings: { currency: "G" },
    player: { currentVillageId: "V00", money: 1_000, inventoryCapacityCrates: 10, continuousMode: true, initialInventory: [] },
    simulation: { startDay: 1, startHour: 0 }, optimization: { periodDays: 2, beamWidth: 30, maxSteps: 8 },
    products, villages, routes, markets,
  };
}

describe("representative sparse-world optimizer benchmark", () => {
  it("compares Baseline, Balanced, and Optimized on the same 22/31/46 world", () => {
    const input = sparseWorld();
    expect(input.villages).toHaveLength(22);
    expect(input.routes).toHaveLength(31);
    expect(input.products).toHaveLength(46);
    const rows = (["baseline", "balanced", "optimized"] as const).map((preset) => {
      const result = runOptimizer(input, { beamWidth: 30, maxSteps: 8, maxExpandedStates: 300, strategy: { preset } });
      expect(result.accumulatedProfit).toBeGreaterThan(0);
      expect(result.statistics.expandedStates).toBeLessThanOrEqual(300);
      expect(result.statistics.maxFrontierSize).toBeLessThanOrEqual(30);
      expect(result.statistics.peakHeapUsedBytes).toBeGreaterThan(0);
      expect(result.statistics.peakRssBytes).toBeGreaterThan(0);
      replayAndExpectResult(input, result);
      return { preset, result };
    });
    const baseline = rows[0].result.statistics;
    console.info("strategy benchmark", JSON.stringify(rows.map(({ preset, result }) => ({
      preset, profit: result.accumulatedProfit, elapsedMs: Number(result.statistics.elapsedMs.toFixed(2)),
      expanded: result.statistics.expandedStates, generated: result.statistics.generatedStates,
      buyCandidates: result.statistics.generatedBuyActions, sellCandidates: result.statistics.generatedSellActions,
      travelCandidates: result.statistics.generatedTravelActions, deduplicated: result.statistics.deduplicatedStates,
      frontier: result.statistics.maxFrontierSize, peakHeap: result.statistics.peakHeapUsedBytes, peakRss: result.statistics.peakRssBytes,
      runtimeReductionPercent: Number(((baseline.elapsedMs - result.statistics.elapsedMs) / baseline.elapsedMs * 100).toFixed(1)),
      generatedReductionPercent: Number(((baseline.generatedStates - result.statistics.generatedStates) / baseline.generatedStates * 100).toFixed(1)),
      expandedReductionPercent: Number(((baseline.expandedStates - result.statistics.expandedStates) / baseline.expandedStates * 100).toFixed(1)),
    }))));
  });
});
