import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import { db } from "./connection";

const migrationsDirectory =
  resolve(
    process.cwd(),
    "database",
    "migrations",
  );

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY
  );
`);

export function runMigrations(): void {
  if (
    !existsSync(
      migrationsDirectory,
    )
  ) {
    return;
  }

  const files = readdirSync(
    migrationsDirectory,
  )
    .filter((file) =>
      file.endsWith(".sql"),
    )
    .sort();

  for (const filename of files) {
    const applied =
      db
        .prepare(
          `
          SELECT filename
          FROM schema_migrations
          WHERE filename = ?
          `,
        )
        .get(filename);

    if (applied) {
      continue;
    }

    const sql =
      readFileSync(
        resolve(
          migrationsDirectory,
          filename,
        ),
        "utf-8",
      );

    const transaction =
      db.transaction(() => {
        db.exec(sql);

        db.prepare(
          `
          INSERT INTO schema_migrations (
            filename
          )
          VALUES (?)
          `,
        ).run(filename);
      });

    transaction();
  }
}