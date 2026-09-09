import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const databasePath = process.env.VITEST
  ? ":memory:"
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
