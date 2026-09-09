import {
  describe,
  expect,
  it,
} from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  WorldData,
} from "../../src/shared/types";

import {
  worldDataSchema,
} from "../../src/shared/schemas";

import {
  createInitialSimulationState,
} from "../../src/simulation";

import {
  SimulationEngine,
} from "../../src/simulation";

function loadWorld(): WorldData {
  const filePath = resolve(
    process.cwd(),
    "database/seed/demo-world.json",
  );

  const data = JSON.parse(
    readFileSync(
      filePath,
      "utf-8",
    ),
  );

  return worldDataSchema.parse(data);
}

describe("Demo World Simulation", () => {
  it("creates the initial simulation state", () => {
    const world = loadWorld();

    const state =
      createInitialSimulationState(
        world,
      );

    expect(
      state.player.location,
    ).toBe("A");

    expect(
      state.player.money,
    ).toBe(1000);

    expect(
      state.villages.A.markets[
        "A-VEG-S"
      ].quantity,
    ).toBe(16);
  });

  it("travels A to B in 4 hours", () => {
    const world = loadWorld();

    const state =
      createInitialSimulationState(
        world,
      );

    const engine =
      new SimulationEngine(
        state,
        world.products,
        world.routes,
        world.markets,
        world.player
          .inventoryCapacityCrates,
      );

    const next =
      engine.travel("B");

    expect(
      next.player.location,
    ).toBe("B");

    expect(next.time).toEqual({
      day: 1,
      hour: 4,
    });
  });

  it("reduces every village reset timer during travel", () => {
    const world = loadWorld();
  
    const state =
      createInitialSimulationState(
        world,
      );
  
    const engine =
      new SimulationEngine(
        state,
        world.products,
        world.routes,
        world.markets,
        world.player
          .inventoryCapacityCrates,
      );
  
    const next =
      engine.travel("B");
  
    expect(
      next.villages.A.reset.current,
    ).toEqual({
      days: 0,
      hours: 8,
    });
  
    expect(
      next.villages.B.reset.current,
    ).toEqual({
      days: 0,
      hours: 8,
    });
  
    expect(
      next.villages.D.reset.current,
    ).toEqual({
      days: 0,
      hours: 8,
    });
  });

  it("uses the forward route when reverse route is missing", () => {
    const world = loadWorld();
  
    const state =
      createInitialSimulationState(
        world,
      );
  
    const engine =
      new SimulationEngine(
        {
          ...state,
          player: {
            ...state.player,
            location: "B",
          },
        },
        world.products,
        world.routes,
        world.markets,
        world.player
          .inventoryCapacityCrates,
      );
  
    const next =
      engine.travel("A");
  
    expect(
      next.time,
    ).toEqual({
      day: 1,
      hour: 4,
    });
  });

});