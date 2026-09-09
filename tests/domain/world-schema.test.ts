import {
  describe,
  expect,
  it,
} from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  worldDataSchema,
} from "../../src/shared/schemas";

describe("Demo World", () => {
  it("matches the world data schema", () => {
    const filePath = resolve(
      process.cwd(),
      "database/seed/demo-world.json",
    );

    const raw = readFileSync(
      filePath,
      "utf-8",
    );

    const data = JSON.parse(raw);

    const result =
      worldDataSchema.safeParse(data);

    expect(result.success).toBe(true);
  });
});