import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/server/app";
import { loadDemoWorld } from "../../src/server/database";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

beforeAll(async () => {
  const app = createApp();
  loadDemoWorld();
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("World and Village HTTP API", () => {
  it("returns the persisted world with a valid shape", async () => {
    const response = await request("/api/world");
    const world = await response.json();

    expect(response.status).toBe(200);
    expect(world).toMatchObject({
      schemaVersion: 1,
      settings: { currency: "THB" },
      simulation: { startDay: 1, startHour: 0 },
    });
  });

  it("exports, imports, saves settings, and rejects invalid WorldData without mutation", async () => {
    const exportedResponse = await request("/api/world/export");
    const exported = await exportedResponse.json();
    expect(exportedResponse.headers.get("content-disposition")).toContain("attachment");

    const importedInput = {
      ...exported,
      settings: { currency: "COINS" },
      player: {
        ...exported.player,
        initialInventory: [{ productId: "VEG", quantity: 2, unitCost: 11.5 }],
      },
    };
    const importedResponse = await request("/api/world/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(importedInput),
    });
    expect(importedResponse.status).toBe(200);
    expect(await importedResponse.json()).toEqual(importedInput);

    const invalidResponse = await request("/api/world/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...importedInput, player: { ...importedInput.player, money: -1 } }),
    });
    expect(invalidResponse.status).toBe(400);
    expect(await (await request("/api/world")).json()).toEqual(importedInput);

    const settingsUpdate = {
      ...importedInput,
      player: { ...importedInput.player, money: 2468, inventoryCapacityCrates: 9 },
      simulation: { startDay: 2, startHour: 6 },
      optimization: { periodDays: 14, beamWidth: 64, maxSteps: 120 },
    };
    const savedResponse = await request("/api/world", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsUpdate),
    });
    expect(savedResponse.status).toBe(200);
    expect(await savedResponse.json()).toEqual(settingsUpdate);
    expect(await (await request("/api/world")).json()).toEqual(settingsUpdate);
  });

  it("creates, reads, updates, moves, and deletes a village", async () => {
    const village = {
      name: "HTTP Village",
      position: { x: 10, y: 20 },
      visual: { icon: "house", image: "assets/villages/http.png" },
      initialReserveMoney: 250,
      reset: {
        current: { days: 0, hours: 2 },
        afterReset: { days: 1, hours: 0 },
      },
    };
    const createdResponse = await request("/api/world/villages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(village),
    });
    const created = await createdResponse.json();
    expect(createdResponse.status).toBe(201);

    const readResponse = await request(`/api/world/villages/${created.id}`);
    expect(await readResponse.json()).toMatchObject(village);

    const updatedResponse = await request(`/api/world/villages/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...village,
        name: "Updated Village",
        visual: { icon: null, image: null },
      }),
    });
    expect(await updatedResponse.json()).toMatchObject({
      name: "Updated Village",
      visual: { icon: null, image: null },
    });

    const movedResponse = await request(
      `/api/world/villages/${created.id}/position`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: 30, y: 40 }),
      },
    );
    expect(await movedResponse.json()).toMatchObject({
      position: { x: 30, y: 40 },
    });

    const deletedResponse = await request(`/api/world/villages/${created.id}`, {
      method: "DELETE",
    });
    expect(deletedResponse.status).toBe(200);
    expect((await request(`/api/world/villages/${created.id}`)).status).toBe(404);
  });

  it("rejects invalid data and returns 404 for unknown villages", async () => {
    const invalid = await request("/api/world/villages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
    expect((await request("/api/world/villages/missing")).status).toBe(404);
  });
});

describe("Route HTTP API", () => {
  it("lists, creates, updates, reads, and deletes a directional route", async () => {
    const createdResponse = await request("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "C",
        to: "D",
        travelTime: { days: 1, hours: 2 },
      }),
    });
    const created = await createdResponse.json();
    expect(createdResponse.status).toBe(201);

    expect(await (await request(`/api/routes/${created.id}`)).json()).toEqual(created);
    expect(await (await request("/api/routes")).json()).toContainEqual(created);

    const updatedResponse = await request(`/api/routes/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "D",
        to: "C",
        travelTime: { days: 0, hours: 7 },
      }),
    });
    expect(await updatedResponse.json()).toMatchObject({
      from: "D",
      to: "C",
      travelTime: { days: 0, hours: 7 },
    });

    expect((await request(`/api/routes/${created.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await request(`/api/routes/${created.id}`)).status).toBe(404);
  });

  it("rejects self routes, zero duration, and unknown villages", async () => {
    for (const input of [
      { from: "A", to: "A", travelTime: { days: 0, hours: 1 } },
      { from: "A", to: "B", travelTime: { days: 0, hours: 0 } },
      { from: "A", to: "missing", travelTime: { days: 0, hours: 1 } },
    ]) {
      const response = await request("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      expect(response.status).toBe(400);
    }
  });

  it("rejects duplicate directions while allowing an explicit reverse route", async () => {
    const duplicate = await request("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "A", to: "B", travelTime: { days: 0, hours: 9 } }) });
    expect(duplicate.status).toBe(409);
    const reverseResponse = await request("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "B", to: "A", travelTime: { days: 0, hours: 9 } }) });
    expect(reverseResponse.status).toBe(201);
    const reverse = await reverseResponse.json();
    expect((await request(`/api/routes/${reverse.id}`, { method: "DELETE" })).status).toBe(200);
  });
});

describe("Market HTTP API", () => {
  it("enforces village/product/side uniqueness and allows both market sides", async () => {
    const supplyInput = { villageId: "B", productId: "MILK", side: "supply", unitPrice: 3, initialQuantity: 4 };
    const supplyResponse = await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplyInput) });
    expect(supplyResponse.status).toBe(201); const supply = await supplyResponse.json();
    expect((await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplyInput) })).status).toBe(409);

    const demandResponse = await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...supplyInput, side: "demand" }) });
    expect(demandResponse.status).toBe(201); const demand = await demandResponse.json();
    expect((await request(`/api/markets/${demand.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(supplyInput) })).status).toBe(409);
    for (const market of [supply, demand]) expect((await request(`/api/markets/${market.id}`, { method: "DELETE" })).status).toBe(200);
  });

  it("rejects zero or negative price and quantity", async () => {
    for (const input of [
      { villageId: "B", productId: "MILK", side: "supply", unitPrice: 0, initialQuantity: 1 },
      { villageId: "B", productId: "MILK", side: "supply", unitPrice: 1, initialQuantity: 0 },
    ]) expect((await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })).status).toBe(400);
  });
});
