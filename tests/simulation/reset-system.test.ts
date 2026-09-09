import { describe, expect, it } from "vitest";

import { villageSchema } from "../../src/shared/schemas";
import type { RuntimeVillage } from "../../src/shared/types";
import { advanceVillageReset } from "../../src/simulation/systems/reset-system";

function createVillage(): RuntimeVillage {
  return {
    initialReserveMoney: 100,
    initialMarkets: { M1: { quantity: 8 } },
    money: 10,
    reset: { current: { days: 0, hours: 2 } },
    resetAfterReset: { days: 0, hours: 3 },
    markets: { M1: { quantity: 1 } },
  };
}

describe("Village resets", () => {
  it("resets reserve money and markets at the exact boundary", () => {
    const result = advanceVillageReset(createVillage(), 2);

    expect(result.money).toBe(100);
    expect(result.markets.M1.quantity).toBe(8);
    expect(result.reset.current).toEqual({ days: 0, hours: 3 });
  });

  it("continues counting after one and multiple resets during travel", () => {
    expect(advanceVillageReset(createVillage(), 4).reset.current).toEqual({
      days: 0,
      hours: 1,
    });
    expect(advanceVillageReset(createVillage(), 8).reset.current).toEqual({
      days: 0,
      hours: 3,
    });
  });

  it("rejects zero reset durations in external village data", () => {
    const result = villageSchema.safeParse({
      id: "A",
      name: "Alpha",
      position: { x: 0, y: 0 },
      initialReserveMoney: 0,
      reset: {
        current: { days: 0, hours: 0 },
        afterReset: { days: 0, hours: 1 },
      },
    });

    expect(result.success).toBe(false);
  });
});
