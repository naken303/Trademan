import type {
  Position,
  Village,
} from "../../../shared/types";

import { db } from "../connection";

interface VillageRow {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  visual_icon: string | null;
  visual_image: string | null;
  initial_reserve_money: number;
  reset_current_days: number;
  reset_current_hours: number;
  reset_after_days: number;
  reset_after_hours: number;
}

function rowToVillage(
  row: VillageRow,
): Village {
  return {
    id: row.id,
    name: row.name,

    position: {
      x: row.position_x,
      y: row.position_y,
    },

    visual: {
      icon: row.visual_icon,
      image: row.visual_image,
    },

    initialReserveMoney:
      row.initial_reserve_money,

    reset: {
      afterReset: {
        days: row.reset_after_days,
        hours: row.reset_after_hours,
      },
    },
  };
}

export function getAllVillages(): Village[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          name,
          position_x,
          position_y,
          visual_icon,
          visual_image,
          initial_reserve_money,
          reset_current_days,
          reset_current_hours,
          reset_after_days,
          reset_after_hours
        FROM villages
        ORDER BY name
      `,
    )
    .all() as VillageRow[];

  return rows.map(rowToVillage);
}

export function getVillageById(
  villageId: string,
): Village | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          name,
          position_x,
          position_y,
          visual_icon,
          visual_image,
          initial_reserve_money,
          reset_current_days,
          reset_current_hours,
          reset_after_days,
          reset_after_hours
        FROM villages
        WHERE id = ?
      `,
    )
    .get(villageId) as
    | VillageRow
    | undefined;

  return row ? rowToVillage(row) : null;
}

export function createVillage(
  village: Village,
): void {
  db.prepare(
    `
      INSERT INTO villages (
        id,
        name,
        position_x,
        position_y,
        visual_icon,
        visual_image,
        initial_reserve_money,
        reset_current_days,
        reset_current_hours,
        reset_after_days,
        reset_after_hours
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    village.id,
    village.name,
    village.position.x,
    village.position.y,
    village.visual?.icon ?? null,
    village.visual?.image ?? null,
    village.initialReserveMoney,
    village.reset.afterReset.days,
    village.reset.afterReset.hours,
    village.reset.afterReset.days,
    village.reset.afterReset.hours,
  );
}

export function updateVillage(
  village: Village,
): void {
  const result = db
    .prepare(
      `
        UPDATE villages
        SET
          name = ?,
          position_x = ?,
          position_y = ?,
          visual_icon = ?,
          visual_image = ?,
          initial_reserve_money = ?,
          reset_current_days = ?,
          reset_current_hours = ?,
          reset_after_days = ?,
          reset_after_hours = ?
        WHERE id = ?
      `,
    )
    .run(
      village.name,
      village.position.x,
      village.position.y,
      village.visual?.icon ?? null,
      village.visual?.image ?? null,
      village.initialReserveMoney,
      village.reset.afterReset.days,
      village.reset.afterReset.hours,
      village.reset.afterReset.days,
      village.reset.afterReset.hours,
      village.id,
    );

  if (result.changes === 0) {
    throw new Error(
      `Village not found: ${village.id}`,
    );
  }
}

export function deleteVillage(
  villageId: string,
): void {
  const result = db
    .prepare(
      `
        DELETE FROM villages
        WHERE id = ?
      `,
    )
    .run(villageId);

  if (result.changes === 0) {
    throw new Error(
      `Village not found: ${villageId}`,
    );
  }
}

export function updateVillagePosition(
  villageId: string,
  position: Position,
): void {
  const statement = db.prepare(`
    UPDATE villages
    SET
      position_x = ?,
      position_y = ?
    WHERE id = ?
  `);

  const result = statement.run(
    position.x,
    position.y,
    villageId,
  );

  if (result.changes === 0) {
    throw new Error(
      `Village not found: ${villageId}`,
    );
  }
}
