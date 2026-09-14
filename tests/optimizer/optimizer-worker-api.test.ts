import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/server/app";
import { importWorld, initializeDatabase } from "../../src/server/database";
import type { WorldData } from "../../src/shared/types";

const servers: Server[] = [];
function profitableWorld(): WorldData { return { schemaVersion: 1, settings: { currency: "G" }, player: { currentVillageId: "A", money: 100, inventoryCapacityCrates: 2, continuousMode: false, initialInventory: [] }, simulation: { startDay: 1, startHour: 0 }, optimization: { periodDays: 1, beamWidth: 40, maxSteps: 4 }, products: [{ id: "P", name: "Product", unitsPerCrate: 10 }], villages: ["A", "B"].map((id, index) => ({ id, name: id, position: { x: index, y: 0 }, initialReserveMoney: 1000, reset: { afterReset: { days: 1, hours: 0 } } })), routes: [{ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 1 } }], markets: [{ id: "A-P-S", villageId: "A", productId: "P", side: "supply", unitPrice: 2, initialQuantity: 10 }, { id: "B-P-D", villageId: "B", productId: "P", side: "demand", unitPrice: 5, initialQuantity: 10 }] }; }
async function listen() { const server = createApp().listen(0, "127.0.0.1"); servers.push(server); await new Promise<void>((resolve) => server.once("listening", resolve)); return `http://127.0.0.1:${(server.address() as AddressInfo).port}`; }
async function complete(url: string, runId: string) { for (let i = 0; i < 50; i += 1) { const value = await (await fetch(`${url}/api/optimizer/runs/${runId}`)).json() as { status: string; result?: { accumulatedProfit: number } }; if (value.status === "completed") return value; await new Promise((resolve) => setTimeout(resolve, 20)); } throw new Error("run did not complete"); }
beforeEach(() => { initializeDatabase(); importWorld(profitableWorld()); });
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe("optimizer jobs", () => {
  it("starts, reports a normal result, and does not use a fixed timeout", async () => {
    const url = await listen(); const started = await (await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beamWidth: 40, maxSteps: 4 }) })).json() as { runId: string };
    const result = await complete(url, started.runId); expect(result.result?.accumulatedProfit).toBe(30);
  });
  it("rejects invalid input, a concurrent run, and unknown jobs", async () => {
    const url = await listen(); expect((await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beamWidth: 0 }) })).status).toBe(400);
    const first = await (await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).json() as { runId: string };
    expect((await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status).toBe(409);
    expect((await fetch(`${url}/api/optimizer/runs/missing`)).status).toBe(404); await complete(url, first.runId);
  });
  it("accepts strict strategy presets and rejects unknown strategy fields", async () => {
    const url = await listen();
    const accepted = await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy: { preset: "custom", smartTravelPruning: true } }) });
    expect(accepted.status).toBe(202);
    const runId = (await accepted.json() as { runId: string }).runId;
    await complete(url, runId);
    expect((await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy: { unknown: true } }) })).status).toBe(400);
  });
  it("brakes cooperatively and returns a normal best-so-far result", async () => {
    const url = await listen(); const started = await (await fetch(`${url}/api/optimizer/runs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ beamWidth: 200, maxSteps: 100, maxExpandedStates: 500000 }) })).json() as { runId: string };
    expect((await fetch(`${url}/api/optimizer/runs/${started.runId}/brake`, { method: "POST" })).status).toBe(200);
    const result = await complete(url, started.runId); expect(result.status).toBe("completed");
  });
});
