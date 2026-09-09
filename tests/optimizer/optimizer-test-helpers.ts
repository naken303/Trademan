import { expect } from "vitest";
import { getTravelTime } from "../../src/domain/route";
import type { OptimizerAction, OptimizerResult } from "../../src/optimizer";
import type { SimulationState, WorldData } from "../../src/shared/types";
import { createInitialSimulationState, SimulationEngine } from "../../src/simulation";

export function materialState(state: SimulationState) {
  return {
    location: state.player.location,
    time: state.time,
    money: state.player.money,
    inventory: [...state.player.inventory].sort((a, b) => a.productId.localeCompare(b.productId)),
    inventoryCost: Object.entries(state.player.inventoryCost).sort(([a], [b]) => a.localeCompare(b)),
    accumulatedProfit: state.accumulatedProfit,
    villages: Object.entries(state.villages).sort(([a], [b]) => a.localeCompare(b)).map(([id, village]) => ({
      id, reset: village.reset.current, money: village.money,
      markets: Object.entries(village.markets).sort(([a], [b]) => a.localeCompare(b)),
    })),
  };
}

function apply(engine: SimulationEngine, action: OptimizerAction) {
  return action.type === "buy" ? engine.buy(action.productId, action.quantity)
    : action.type === "sell" ? engine.sell(action.productId, action.quantity)
      : engine.travel(action.destinationId);
}

export function replayAndExpectResult(world: WorldData, result: OptimizerResult) {
  const engine = new SimulationEngine(createInitialSimulationState(world), world.products, world.routes, world.markets, world.player.inventoryCapacityCrates);
  for (const step of result.plan) {
    const state = apply(engine, step.action);
    expect(step).toMatchObject({ time: state.time, villageId: state.player.location, playerMoney: state.player.money, accumulatedProfit: state.accumulatedProfit });
  }
  const replayed = engine.getState();
  expect(materialState(replayed)).toEqual(materialState(result.finalState));
  expect(replayed.accumulatedProfit).toBe(result.accumulatedProfit);
  return replayed;
}

export function exactTinyMaximumProfit(world: WorldData, maxSteps: number, maxQuantity: number) {
  const initial = createInitialSimulationState(world);
  const deadline = initial.time.day * 24 + initial.time.hour + world.optimization.periodDays * 24;
  let best = initial.accumulatedProfit;
  function visit(state: SimulationState, depth: number) {
    best = Math.max(best, state.accumulatedProfit);
    if (depth === maxSteps) return;
    const actions: OptimizerAction[] = [];
    for (const market of [...world.markets].sort((a, b) => a.id.localeCompare(b.id))) {
      if (market.villageId !== state.player.location) continue;
      for (let quantity = 1; quantity <= maxQuantity; quantity += 1) actions.push({ type: market.side === "supply" ? "buy" : "sell", productId: market.productId, quantity });
    }
    for (const village of [...world.villages].sort((a, b) => a.id.localeCompare(b.id))) {
      if (village.id !== state.player.location && getTravelTime(world.routes, state.player.location, village.id)) actions.push({ type: "travel", destinationId: village.id });
    }
    for (const action of actions) {
      const engine = new SimulationEngine(state, world.products, world.routes, world.markets, world.player.inventoryCapacityCrates);
      try {
        const next = apply(engine, action);
        if (next.time.day * 24 + next.time.hour <= deadline) visit(next, depth + 1);
      } catch { /* Exhaustive test helper intentionally probes invalid tiny-world actions. */ }
    }
  }
  visit(initial, 0);
  return best;
}
