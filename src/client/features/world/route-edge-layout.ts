import type { Position as WorldPosition, Route } from "../../../shared/types";

export type RouteHandleSide = "top" | "right" | "bottom" | "left";

export interface RoutePairLayout {
  pairKey: string;
  reversePair: boolean;
  canonicalForward: boolean;
  curveSide: -1 | 0 | 1;
}

export interface RouteEdgeGeometry {
  path: string;
  labelX: number;
  labelY: number;
  controlX: number;
  controlY: number;
  offset: number;
  curveSide: -1 | 0 | 1;
}

export function getCanonicalRoutePair(from: string, to: string): [string, string] {
  return from <= to ? [from, to] : [to, from];
}

export function getCanonicalRoutePairKey(from: string, to: string): string {
  return JSON.stringify(getCanonicalRoutePair(from, to));
}

export function resolveRoutePairLayouts(routes: Route[]): Map<string, RoutePairLayout> {
  const directions = new Set(routes.map((route) => `${getCanonicalRoutePairKey(route.from, route.to)}:${route.from}->${route.to}`));
  const result = new Map<string, RoutePairLayout>();

  for (const route of routes) {
    const [first, second] = getCanonicalRoutePair(route.from, route.to);
    const pairKey = getCanonicalRoutePairKey(route.from, route.to);
    const reversePair = directions.has(`${pairKey}:${route.to}->${route.from}`);
    const canonicalForward = route.from === first && route.to === second;
    result.set(route.id, {
      pairKey,
      reversePair,
      canonicalForward,
      curveSide: reversePair ? (canonicalForward ? 1 : -1) : 0,
    });
  }

  return result;
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
  reversePair: boolean;
  canonicalForward: boolean;
}): RouteEdgeGeometry {
  const { source, target, reversePair, canonicalForward } = input;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  const curveSide: -1 | 0 | 1 = reversePair ? (canonicalForward ? 1 : -1) : 0;

  if (length === 0) {
    return {
      path: `M ${source.x},${source.y} L ${target.x},${target.y}`,
      labelX: source.x,
      labelY: source.y,
      controlX: source.x,
      controlY: source.y,
      offset: 0,
      curveSide,
    };
  }

  const offset = reversePair ? Math.min(52, Math.max(24, length * 0.14)) : 0;
  const localCurveDirection = reversePair ? 1 : 0;
  const perpendicularX = -dy / length;
  const perpendicularY = dx / length;
  const controlX = (source.x + target.x) / 2 + perpendicularX * offset * localCurveDirection;
  const controlY = (source.y + target.y) / 2 + perpendicularY * offset * localCurveDirection;
  const labelX = source.x * 0.25 + controlX * 0.5 + target.x * 0.25;
  const labelY = source.y * 0.25 + controlY * 0.5 + target.y * 0.25;

  return {
    path: `M ${source.x},${source.y} Q ${controlX},${controlY} ${target.x},${target.y}`,
    labelX,
    labelY,
    controlX,
    controlY,
    offset,
    curveSide,
  };
}

export function formatRouteDuration(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || parts.length === 0) parts.push(`${hours}h`);
  return parts.join(" ");
}
