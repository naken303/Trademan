import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const configuredDatabasePath = process.env.VILLAGE_TRADE_DATABASE_PATH;

const databasePath = process.env.VITEST
  ? ":memory:"
  : configuredDatabasePath
    ? resolve(configuredDatabasePath)
    : resolve(
      process.cwd(),
      "database",
      "village-trade.sqlite",
    );

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), {
    recursive: true,
  });
}

export const db = new Database(
  databasePath,
);

db.pragma("foreign_keys = ON");
