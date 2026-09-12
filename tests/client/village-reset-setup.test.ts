import { describe, expect, it } from "vitest";
import type { Village } from "../../src/shared/types";
import { createVillageResetDraft, parseVillageResetDraft } from "../../src/client/components/village-reset-setup-model";

const villages: Village[] = [
  { id: "A", name: "Alpha", position: { x: 0, y: 0 }, initialReserveMoney: 10, reset: { afterReset: { days: 1, hours: 2 } } },
  { id: "B", name: "Beta", position: { x: 1, y: 1 }, initialReserveMoney: 20, reset: { afterReset: { days: 0, hours: 8 } } },
];

describe("Village reset setup", () => {
  it("creates defaults from each village reset cycle", () => {
    expect(createVillageResetDraft(villages)).toEqual({ A: { days: "1", hours: "2" }, B: { days: "0", hours: "8" } });
  });

  it("maps edited values to the correct village IDs", () => {
    const parsed = parseVillageResetDraft(villages, { A: { days: "0", hours: "3" }, B: { days: "2", hours: "4" } });
    expect(parsed.errors).toEqual({});
    expect(parsed.initialization).toEqual({ villageResetRemaining: { A: { days: 0, hours: 3 }, B: { days: 2, hours: 4 } } });
  });

  it.each([
    [{ A: { days: "-1", hours: "2" }, B: { days: "0", hours: "8" } }, "days"],
    [{ A: { days: "0", hours: "24" }, B: { days: "0", hours: "8" } }, "hours"],
    [{ A: { days: "0", hours: "0" }, B: { days: "0", hours: "8" } }, "duration"],
  ] as const)("returns a local error without emitting invalid initialization", (values, field) => {
    const parsed = parseVillageResetDraft(villages, values);
    expect(parsed.initialization).toBeNull();
    expect(parsed.errors.A[field]).toBeTruthy();
    expect(parsed.errors.B).toBeUndefined();
  });
});
