import { describe, expect, it } from "vitest";
import type { Route } from "../../src/shared/types";
import {
  resolveRouteEdgeGeometry,
  resolveRoutePairLayouts,
  selectRouteHandleSides,
} from "../../src/client/features/world/route-edge-layout";

const forward: Route = { id: "A-B", from: "A", to: "B", travelTime: { days: 0, hours: 4 } };
const reverse: Route = { id: "B-A", from: "B", to: "A", travelTime: { days: 0, hours: 7 } };

describe("directional route edge layout", () => {
  it("selects opposing handles for horizontal and vertical routes", () => {
    expect(selectRouteHandleSides({ x: 0, y: 0 }, { x: 100, y: 10 })).toEqual({ sourceSide: "right", targetSide: "left" });
    expect(selectRouteHandleSides({ x: 0, y: 0 }, { x: 10, y: 100 })).toEqual({ sourceSide: "bottom", targetSide: "top" });
    expect(selectRouteHandleSides({ x: 100, y: 100 }, { x: 0, y: 90 })).toEqual({ sourceSide: "left", targetSide: "right" });
    expect(selectRouteHandleSides({ x: 100, y: 100 }, { x: 90, y: 0 })).toEqual({ sourceSide: "top", targetSide: "bottom" });
  });

  it("chooses diagonal sides deterministically and recomputes after movement", () => {
    expect(selectRouteHandleSides({ x: 0, y: 0 }, { x: 80, y: 100 })).toEqual({ sourceSide: "bottom", targetSide: "top" });
    expect(selectRouteHandleSides({ x: 0, y: 0 }, { x: 120, y: 100 })).toEqual({ sourceSide: "right", targetSide: "left" });
  });

  it("keeps a single route direct without a reverse-pair offset", () => {
    const layout = resolveRoutePairLayouts([forward]).get(forward.id)!;
    const geometry = resolveRouteEdgeGeometry({ source: { x: 0, y: 0 }, target: { x: 100, y: 0 }, ...layout });
    expect(layout.reversePair).toBe(false);
    expect(geometry.offset).toBe(0);
    expect(geometry.controlY).toBe(0);
  });

  it("separates reverse routes with stable opposite curve sides and labels", () => {
    const layouts = resolveRoutePairLayouts([forward, reverse]);
    const forwardGeometry = resolveRouteEdgeGeometry({ source: { x: 0, y: 0 }, target: { x: 100, y: 0 }, ...layouts.get(forward.id)! });
    const reverseGeometry = resolveRouteEdgeGeometry({ source: { x: 100, y: 0 }, target: { x: 0, y: 0 }, ...layouts.get(reverse.id)! });
    expect(layouts.get(forward.id)?.curveSide).toBe(1);
    expect(layouts.get(reverse.id)?.curveSide).toBe(-1);
    expect(forwardGeometry.path).not.toBe(reverseGeometry.path);
    expect(forwardGeometry.labelY).toBeGreaterThan(0);
    expect(reverseGeometry.labelY).toBeLessThan(0);
  });

  it("is independent of route array ordering", () => {
    const first = resolveRoutePairLayouts([forward, reverse]);
    const reordered = resolveRoutePairLayouts([reverse, forward]);
    expect(reordered.get(forward.id)).toEqual(first.get(forward.id));
    expect(reordered.get(reverse.id)).toEqual(first.get(reverse.id));
  });

  it("handles zero-distance endpoints without non-finite geometry", () => {
    const geometry = resolveRouteEdgeGeometry({ source: { x: 5, y: 5 }, target: { x: 5, y: 5 }, reversePair: true, canonicalForward: true });
    expect(Object.values(geometry).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
    expect(geometry.path).not.toMatch(/NaN|Infinity/);
  });
});
