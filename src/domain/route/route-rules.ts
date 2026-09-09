import type { Route } from "../../shared/types";

export function findRoute(
  routes: Route[],
  from: string,
  to: string,
): Route | undefined {
  return routes.find(
    (route) =>
      route.from === from &&
      route.to === to,
  );
}

export function getTravelTime(
  routes: Route[],
  from: string,
  to: string,
) {
  const directRoute = findRoute(routes, from, to);

  if (directRoute) {
    return directRoute.travelTime;
  }

  const reverseRoute = findRoute(
    routes,
    to,
    from,
  );

  return reverseRoute?.travelTime;
}