import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { WorldData } from "../../src/shared/types";
import { createApp } from "../../src/server/app";
import { importWorld, initializeDatabase } from "../../src/server/database";
import {
  OptimizerTimeoutError,
  runOptimizerInWorker,
} from "../../src/server/services/optimizer-worker-runner";

const servers: Server[] = [];

function profitableWorld(): WorldData {
  return {
    schemaVersion: 1,
    settings: { currency: "G" },
    player: { currentVillageId: "A", money: 100, inventoryCapacityCrates: 2, continuousMode: false, initialInventory: [] },
    simulation: { startDay: 1, startHour: 0 },
    optimization: { periodDays: 1, beamWidth: 40, maxSteps: 4 },
    products: [{ id: "P", name: "Product", unitsPerCrate: 10 }],
    villages: ["A", "B"].map((id, index) => ({
      id, name: id, position: { x: index, y: 0 }, initialReserveMoney: 1000,
      reset: { current: { days: 1, hours: 0 }, afterReset: { days: 1, hours: 0 } },
    })),
    routes: [{ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } }],
    markets: [
      { id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 },
      { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 10 },
    ],
  };
}

async function listen(app: ReturnType<typeof createApp>) {
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

beforeEach(() => {
  initializeDatabase();
  importWorld(profitableWorld());
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  })));
});

describe("optimizer worker runner", () => {
  it("returns a profitable result and isolates simultaneous runs", async () => {
    const input = profitableWorld();
    const [first, second] = await Promise.all([
      runOptimizerInWorker(input, { beamWidth: 40, maxSteps: 4 }),
      runOptimizerInWorker(input, { beamWidth: 40, maxSteps: 4 }),
    ]);
    expect(first.accumulatedProfit).toBe(30);
    expect(second.accumulatedProfit).toBe(30);
    expect(second.plan).toEqual(first.plan);
    expect(second.finalState).toEqual(first.finalState);
  });

  it("rejects worker failures and timeouts without leaving a hanging worker", async () => {
    const input = profitableWorld();
    await expect(runOptimizerInWorker(input, { periodDays: 0 })).rejects.toThrow("positive integers");
    await expect(runOptimizerInWorker(input, {}, { timeoutMs: 1 })).rejects.toBeInstanceOf(OptimizerTimeoutError);
    await expect(runOptimizerInWorker(input, { beamWidth: 20, maxSteps: 4 })).resolves.toMatchObject({ accumulatedProfit: 30 });
  });
});

describe("optimizer HTTP API", () => {
  it("uses persisted WorldData and rejects client-supplied worlds or unsafe limits", async () => {
    const baseUrl = await listen(createApp());
    const invalidWorld = await fetch(`${baseUrl}/api/optimizer/run`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: { player: { money: 999999 } } }),
    });
    expect(invalidWorld.status).toBe(400);

    for (const invalid of [{ beamWidth: 0 }, { maxSteps: 501 }, { maxExpandedStates: 500_001 }, { timeoutSeconds: 0 }, { timeoutSeconds: 601 }]) {
      const response = await fetch(`${baseUrl}/api/optimizer/run`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invalid),
      });
      expect(response.status).toBe(400);
    }

    const response = await fetch(`${baseUrl}/api/optimizer/run`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beamWidth: 40, maxSteps: 4, maxExpandedStates: 1000 }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ accumulatedProfit: 30, options: { periodDays: 1 } });
  });

  it("passes a bounded run-specific timeout to the worker runner", async () => {
    let receivedTimeout: number | undefined;
    const baseUrl = await listen(createApp({ optimizerRunner: async (world, options, runnerOptions) => {
      receivedTimeout = runnerOptions?.timeoutMs;
      return runOptimizerInWorker(world, options, { timeoutMs: 5_000 });
    } }));
    const response = await fetch(`${baseUrl}/api/optimizer/run`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beamWidth: 20, maxSteps: 4, timeoutSeconds: 90 }),
    });
    expect(response.status).toBe(200);
    expect(receivedTimeout).toBe(90_000);
  });

  it("maps timeout and runtime failures while keeping the server responsive", async () => {
    const timeoutUrl = await listen(createApp({ optimizerRunner: async () => { throw new OptimizerTimeoutError(); } }));
    expect((await fetch(`${timeoutUrl}/api/optimizer/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(504);
    expect((await fetch(`${timeoutUrl}/api/health`)).status).toBe(200);

    const failureUrl = await listen(createApp({ optimizerRunner: async () => { throw new Error("private path details"); } }));
    const failure = await fetch(`${failureUrl}/api/optimizer/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(failure.status).toBe(500);
    expect(await failure.json()).toEqual({ error: "Optimizer execution failed" });
    expect((await fetch(`${failureUrl}/api/health`)).status).toBe(200);
  });
});
