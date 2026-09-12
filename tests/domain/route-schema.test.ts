import { describe, expect, it } from "vitest";

import { routeSchema } from "../../src/shared/schemas";

describe("Route contract", () => {
  it("accepts a bidirectional route with an optional return duration", () => {
    expect(routeSchema.safeParse({
      id: "A-B",
      from: "A",
      to: "B",
      travelTime: { days: 1, hours: 23 },
      reverseTravelTime: { days: 0, hours: 6 },
    }).success).toBe(true);
  });

  it("rejects a zero return duration", () => {
    expect(routeSchema.safeParse({ id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 4 }, reverseTravelTime: { days: 0, hours: 0 } }).success).toBe(false);
  });

  it("rejects a self route and zero travel duration", () => {
    expect(routeSchema.safeParse({
      id: "A-A",
      from: "A",
      to: "A",
      travelTime: { days: 0, hours: 0 },
    }).success).toBe(false);
  });
});
