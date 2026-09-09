import {
  describe,
  expect,
  it,
} from "vitest";

import {
  db,
} from "../../src/server/database";

import {
  initializeDatabase,
} from "../../src/server/database";

describe("SQLite Database", () => {
  it("initializes the database", () => {
    initializeDatabase();

    const tables =
      db
        .prepare(
          `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
          ORDER BY name
          `,
        )
        .all() as Array<{
          name: string;
        }>;

    const names =
      tables.map(
        (table) => table.name,
      );

    expect(names).toContain(
      "villages",
    );

    expect(names).toContain(
      "products",
    );

    expect(names).toContain(
      "routes",
    );

    expect(names).toContain(
      "markets",
    );
  });
});