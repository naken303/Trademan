import { describe, expect, it } from "vitest";
import { cratesToUnits, unitsToCrates } from "../../src/domain/market";

describe("market unit and crate conversion", () => {
  it.each([[20, 1], [30, 1.5], [45, 2.25]])("converts %i units to %s crates", (units, crates) => {
    expect(unitsToCrates(units, 20)).toBe(crates);
    expect(cratesToUnits(crates, 20)).toBe(units);
  });

  it("rejects invalid quantities and fractional unit results", () => {
    expect(() => unitsToCrates(0, 20)).toThrow();
    expect(() => cratesToUnits(-1, 20)).toThrow();
    expect(() => cratesToUnits(Number.NaN, 20)).toThrow();
    expect(() => cratesToUnits(1.33, 20)).toThrow("whole number of units");
  });
});
