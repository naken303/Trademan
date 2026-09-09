import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { basename, resolve } from "node:path";
import type { WorldData } from "../../shared/types";
import { worldDataSchema } from "../../shared/schemas";

export function serializeWorld(world: WorldData): string {
  return `${JSON.stringify(worldDataSchema.parse(world), null, 2)}\n`;
}

export function createWorldBackup(
  world: WorldData,
  backupDirectory = process.env.VILLAGE_TRADE_BACKUP_DIRECTORY ?? resolve(process.cwd(), "backups"),
): string {
  mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const filename = `world-${timestamp}-${randomUUID().slice(0, 8)}.json`;
  const backupPath = resolve(backupDirectory, filename);
  writeFileSync(backupPath, serializeWorld(world), { encoding: "utf8", flag: "wx" });
  return basename(backupPath);
}
