import type { Position as WorldPosition } from "../../../shared/types";

export type RouteHandleSide = "top" | "right" | "bottom" | "left";

export interface RouteEdgeGeometry {
  path: string;
  labelX: number;
  labelY: number;
}

export function selectRouteHandleSides(source: WorldPosition, target: WorldPosition): {
  sourceSide: RouteHandleSide;
  targetSide: RouteHandleSide;
} {
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceSide: "right", targetSide: "left" }
      : { sourceSide: "left", targetSide: "right" };
  }

  return dy >= 0
    ? { sourceSide: "bottom", targetSide: "top" }
    : { sourceSide: "top", targetSide: "bottom" };
}

export function resolveRouteEdgeGeometry(input: {
  source: WorldPosition;
  target: WorldPosition;
}): RouteEdgeGeometry {
  const { source, target } = input;

  return {
    path: `M ${source.x},${source.y} L ${target.x},${target.y}`,
    labelX: (source.x + target.x) / 2,
    labelY: (source.y + target.y) / 2,
  };
}

export function formatRouteDuration(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length === 0) parts.push(`${hours}h`);
  return parts.join(" ");
}
