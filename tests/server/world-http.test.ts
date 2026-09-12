import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../src/server/app";
import { loadDemoWorld } from "../../src/server/database";
import { worldDataSchema } from "../../src/shared/schemas";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

async function expectValidWorld() {
  const response = await request("/api/world");
  expect(response.status).toBe(200);
  return worldDataSchema.parse(await response.json());
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
    await expectValidWorld();
  });

  it("rejects invalid data and returns 404 for unknown villages", async () => {
    const invalid = await request("/api/world/villages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(invalid.status).toBe(400);
    expect((await request("/api/world/villages/missing")).status).toBe(404);
    expect((await request("/api/world/villages/missing", { method: "DELETE" })).status).toBe(404);
  });

  it("returns a client-safe conflict when deleting the player's current village", async () => {
    const before = await expectValidWorld();
    const response = await request(`/api/world/villages/${before.player.currentVillageId}`, { method: "DELETE" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "This village is the player's current village. Choose another current village in Database & Settings before deleting it.",
    });
    expect(await expectValidWorld()).toEqual(before);
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
    await expectValidWorld();
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

  it("treats both orientations as one route pair", async () => {
    const duplicate = await request("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "A", to: "B", travelTime: { days: 0, hours: 9 } }) });
    expect(duplicate.status).toBe(409);
    const reverseResponse = await request("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: "B", to: "A", travelTime: { days: 0, hours: 9 } }) });
    expect(reverseResponse.status).toBe(409);
    await expectValidWorld();
  });
});

describe("Product HTTP API", () => {
  it("generates monotonic product IDs and preserves legacy IDs", async () => {
    const create = () => request("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Generated", unitsPerCrate: 2 }) });
    const first = await (await create()).json();
    const second = await (await create()).json();
    expect(first.id).toMatch(/^P\d{6}$/);
    expect(Number(second.id.slice(1))).toBeGreaterThan(Number(first.id.slice(1)));
    await request(`/api/products/${second.id}`, { method: "DELETE" });
    const third = await (await create()).json();
    expect(Number(third.id.slice(1))).toBeGreaterThan(Number(second.id.slice(1)));
    expect((await request("/api/products/MILK")).status).toBe(200);
    for (const id of [first.id, third.id]) await request(`/api/products/${id}`, { method: "DELETE" });
  });
  it("round-trips optional base prices and does not update an existing market", async () => {
    const product = { name: "HTTP Product", unitsPerCrate: 10, baseSupplyPrice: 7 };
    const created = await request("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
    expect(created.status).toBe(201);
    const createdProduct = await created.json();
    expect(createdProduct).toMatchObject(product);
    expect(createdProduct.id).toMatch(/^P\d{6}$/);

    const marketResponse = await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ villageId: "B", productId: createdProduct.id, side: "supply", unitPrice: 9, initialQuantity: 3 }) });
    const market = await marketResponse.json();
    expect(marketResponse.status).toBe(201);

    const updatedProduct = { ...createdProduct, name: "Renamed HTTP Product", baseSupplyPrice: 12, baseDemandPrice: 15 };
    const updated = await request(`/api/products/${createdProduct.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedProduct) });
    expect(await updated.json()).toEqual(updatedProduct);
    expect(await (await request(`/api/markets/${market.id}`)).json()).toMatchObject({ unitPrice: 9 });

    expect((await request(`/api/markets/${market.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await request(`/api/products/${createdProduct.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await request(`/api/products/${createdProduct.id}`)).status).toBe(404);
    await expectValidWorld();
  });

  it("rejects invalid product base prices", async () => {
    for (const value of [0, -1]) {
      const response = await request("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `BAD-${value}`, name: "Bad", unitsPerCrate: 10, baseDemandPrice: value }) });
      expect(response.status).toBe(400);
    }
    expect((await request("/api/products/MISSING", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "MISSING", name: "Missing", unitsPerCrate: 1 }) })).status).toBe(404);
    expect((await request("/api/products/MISSING", { method: "DELETE" })).status).toBe(404);
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
    await expectValidWorld();
  });

  it("rejects zero or negative price and quantity", async () => {
    for (const input of [
      { villageId: "B", productId: "MILK", side: "supply", unitPrice: 0, initialQuantity: 1 },
      { villageId: "B", productId: "MILK", side: "supply", unitPrice: 1, initialQuantity: 0 },
    ]) expect((await request("/api/markets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })).status).toBe(400);
    expect((await request("/api/markets/missing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ villageId: "A", productId: "MILK", side: "supply", unitPrice: 1, initialQuantity: 1 }) })).status).toBe(404);
    expect((await request("/api/markets/missing", { method: "DELETE" })).status).toBe(404);
  });
});
