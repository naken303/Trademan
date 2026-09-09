import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { worldDataSchema } from "../../src/shared/schemas";
import type { WorldData } from "../../src/shared/types";
import {
  createWorldBackup,
  getWorld,
  importWorld,
  initializeDatabase,
  loadDemoWorld,
  serializeWorld,
} from "../../src/server/database";

let temporaryDirectories: string[] = [];

beforeEach(() => {
  initializeDatabase();
  loadDemoWorld();
});

afterEach(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true, force: true });
  temporaryDirectories = [];
});

describe("world import, export, backup, and settings", () => {
  it("exports valid WorldData that round-trips through the shared schema", () => {
    const world = getWorld();
    expect(worldDataSchema.parse(JSON.parse(serializeWorld(world)))).toEqual(world);
  });

  it("imports a valid world and preserves initial inventory unitCost", () => {
    const input: WorldData = {
      ...getWorld(),
      settings: { currency: "SILVER" },
      player: {
        ...getWorld().player,
        money: 4321,
        inventoryCapacityCrates: 7,
        continuousMode: true,
        initialInventory: [{ productId: "VEG", quantity: 3, unitCost: 12.5 }],
      },
      simulation: { startDay: 4, startHour: 9 },
      optimization: { periodDays: 12, beamWidth: 42, maxSteps: 99 },
    };

    importWorld(input);
    expect(getWorld()).toEqual(input);
    expect(getWorld().player.initialInventory[0]?.unitCost).toBe(12.5);
  });

  it("rejects invalid input without changing the persisted world", () => {
    const before = getWorld();
    expect(() => importWorld({ ...before, player: { ...before.player, money: -1 } })).toThrow();
    expect(getWorld()).toEqual(before);
  });

  it("rolls back a schema-valid import when database constraints fail", () => {
    const before = getWorld();
    const invalidReference = { ...before, player: { ...before.player, currentVillageId: "missing" } };
    expect(() => importWorld(invalidReference)).toThrow();
    expect(getWorld()).toEqual(before);
  });

  it("creates a parseable JSON backup only in the supplied temporary directory", () => {
    const directory = mkdtempSync(join(tmpdir(), "village-trade-backup-"));
    temporaryDirectories.push(directory);
    const world = getWorld();
    const filename = createWorldBackup(world, directory);
    const backup = JSON.parse(readFileSync(join(directory, filename), "utf8"));
    expect(worldDataSchema.parse(backup)).toEqual(world);
  });
});
