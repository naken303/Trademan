import { describe, expect, it } from "vitest";
import {
  resolveRouteEdgeGeometry,
  selectRouteHandleSides,
} from "../../src/client/features/world/route-edge-layout";

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

  it("renders one direct edge with a centered duration label", () => {
    expect(resolveRouteEdgeGeometry({ source: { x: 0, y: 0 }, target: { x: 100, y: 40 } })).toEqual({
      path: "M 0,0 L 100,40",
      labelX: 50,
      labelY: 20,
    });
  });

  it("handles zero-distance endpoints without non-finite geometry", () => {
    const geometry = resolveRouteEdgeGeometry({ source: { x: 5, y: 5 }, target: { x: 5, y: 5 } });
    expect(Object.values(geometry).filter((value) => typeof value === "number").every(Number.isFinite)).toBe(true);
    expect(geometry.path).not.toMatch(/NaN|Infinity/);
  });
});
