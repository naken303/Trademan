import type {
  Route,
} from "../../../shared/types";

import { db } from "../connection";

export function getAllRoutes(): Route[] {
  const rows = db
    .prepare(
      `
      SELECT
        id,
        from_village_id,
        to_village_id,
        travel_days,
        travel_hours
      FROM routes
      ORDER BY id
      `,
    )
    .all() as Array<{
      id: string;
      from_village_id: string;
      to_village_id: string;
      travel_days: number;
      travel_hours: number;
    }>;

  return rows.map((row) => ({
    id: row.id,

    from:
      row.from_village_id,

    to:
      row.to_village_id,

    travelTime: {
      days:
        row.travel_days,

      hours:
        row.travel_hours,
    },
  }));
}

export function getRouteById(routeId: string): Route | null {
  const row = db.prepare(`
    SELECT id, from_village_id, to_village_id, travel_days, travel_hours
    FROM routes
    WHERE id = ?
  `).get(routeId) as
    | {
        id: string;
        from_village_id: string;
        to_village_id: string;
        travel_days: number;
        travel_hours: number;
      }
    | undefined;

  return row
    ? {
        id: row.id,
        from: row.from_village_id,
        to: row.to_village_id,
        travelTime: { days: row.travel_days, hours: row.travel_hours },
      }
    : null;
}

export function createRoute(route: Route): void {
  db.prepare(`
    INSERT INTO routes (
      id, from_village_id, to_village_id, travel_days, travel_hours
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    route.id,
    route.from,
    route.to,
    route.travelTime.days,
    route.travelTime.hours,
  );
}

export function updateRoute(route: Route): void {
  const result = db.prepare(`
    UPDATE routes
    SET from_village_id = ?, to_village_id = ?, travel_days = ?, travel_hours = ?
    WHERE id = ?
  `).run(
    route.from,
    route.to,
    route.travelTime.days,
    route.travelTime.hours,
    route.id,
  );

  if (result.changes === 0) {
    throw new Error(`Route not found: ${route.id}`);
  }
}

export function deleteRoute(routeId: string): void {
  const result = db.prepare("DELETE FROM routes WHERE id = ?").run(routeId);

  if (result.changes === 0) {
    throw new Error(`Route not found: ${routeId}`);
  }
}
