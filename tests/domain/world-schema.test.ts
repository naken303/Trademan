import {
  describe,
  expect,
  it,
} from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  productSchema,
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

describe("Product base prices", () => {
  const product = { id: "P", name: "Product", unitsPerCrate: 10 };

  it("accepts absent, supply-only, demand-only, and both defaults", () => {
    for (const input of [
      product,
      { ...product, baseSupplyPrice: 2 },
      { ...product, baseDemandPrice: 3 },
      { ...product, baseSupplyPrice: 2, baseDemandPrice: 3 },
    ]) expect(productSchema.safeParse(input).success).toBe(true);
  });

  it("rejects zero and negative defaults when provided", () => {
    expect(productSchema.safeParse({ ...product, baseSupplyPrice: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ ...product, baseDemandPrice: -1 }).success).toBe(false);
  });
});
