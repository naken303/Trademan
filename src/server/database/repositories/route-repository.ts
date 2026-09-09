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