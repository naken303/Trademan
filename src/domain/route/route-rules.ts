import type { Route } from "../../shared/types";

export function findRoute(
  routes: Route[],
  from: string,
  to: string,
): Route | undefined {
  return routes.find((route) =>
    (route.from === from && route.to === to) ||
    (route.from === to && route.to === from));
}

export function getTravelTime(
  routes: Route[],
  from: string,
  to: string,
) {
  const route = findRoute(routes, from, to);
  if (!route) return undefined;
  return route.from === from
    ? route.travelTime
    : route.reverseTravelTime ?? route.travelTime;
}
