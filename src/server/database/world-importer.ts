import type { WorldData } from "../../shared/types";
import { worldDataSchema } from "../../shared/schemas";
import { db } from "./connection";

export function importWorld(
  input: unknown,
): void {
  const world = worldDataSchema.parse(input);

  const transaction = db.transaction(
    (data: WorldData) => {
      db.prepare(
        "DELETE FROM markets",
      ).run();

      db.prepare(
        "DELETE FROM routes",
      ).run();

      db.prepare(
        "DELETE FROM player_settings",
      ).run();

      db.prepare(
        "DELETE FROM optimization_settings",
      ).run();

      db.prepare(
        "DELETE FROM player_initial_inventory",
      ).run();

      db.prepare(
        "DELETE FROM world_settings",
      ).run();

      db.prepare(
        "DELETE FROM products",
      ).run();

      db.prepare(
        "DELETE FROM villages",
      ).run();

      const insertVillage =
        db.prepare(`
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
        `);

      for (const village of data.villages) {
        insertVillage.run(
          village.id,
          village.name,
          village.position.x,
          village.position.y,
          village.visual?.icon ?? null,
          village.visual?.image ?? null,
          village.initialReserveMoney,
          village.reset.current.days,
          village.reset.current.hours,
          village.reset.afterReset.days,
          village.reset.afterReset.hours,
        );
      }

      const insertProduct =
        db.prepare(`
          INSERT INTO products (
            id,
            name,
            category,
            image_type,
            image_path,
            units_per_crate,
            base_supply_price,
            base_demand_price
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

      for (const product of data.products) {
        insertProduct.run(
          product.id,
          product.name,
          product.category ?? null,
          product.image?.type ?? null,
          product.image?.path ?? null,
          product.unitsPerCrate,
          product.baseSupplyPrice ?? null,
          product.baseDemandPrice ?? null,
        );
      }

      const insertRoute =
        db.prepare(`
          INSERT INTO routes (
            id,
            from_village_id,
            to_village_id,
            travel_days,
            travel_hours
          )
          VALUES (?, ?, ?, ?, ?)
        `);

      for (const route of data.routes) {
        insertRoute.run(
          route.id,
          route.from,
          route.to,
          route.travelTime.days,
          route.travelTime.hours,
        );
      }

      const insertMarket =
        db.prepare(`
          INSERT INTO markets (
            id,
            village_id,
            product_id,
            side,
            unit_price,
            initial_quantity
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `);

      for (const market of data.markets) {
        insertMarket.run(
          market.id,
          market.villageId,
          market.productId,
          market.side,
          market.unitPrice,
          market.initialQuantity,
        );
      }

      db.prepare(`
        INSERT INTO world_settings (
          id,
          schema_version,
          currency,
          simulation_start_day,
          simulation_start_hour
        )
        VALUES (1, ?, ?, ?, ?)
      `).run(
        data.schemaVersion,
        data.settings.currency,
        data.simulation.startDay,
        data.simulation.startHour,
      );

      const insertInitialInventory = db.prepare(`
        INSERT INTO player_initial_inventory (
          product_id,
          quantity,
          unit_cost
        )
        VALUES (?, ?, ?)
      `);

      for (const item of data.player.initialInventory) {
        insertInitialInventory.run(
          item.productId,
          item.quantity,
          item.unitCost,
        );
      }

      db.prepare(`
        INSERT INTO player_settings (
          id,
          current_village_id,
          money,
          inventory_capacity_crates,
          continuous_mode
        )
        VALUES (1, ?, ?, ?, ?)
      `).run(
        data.player.currentVillageId,
        data.player.money,
        data.player.inventoryCapacityCrates,
        data.player.continuousMode ? 1 : 0,
      );

      db.prepare(`
        INSERT INTO optimization_settings (
          id,
          period_days,
          beam_width,
          max_steps
        )
        VALUES (1, ?, ?, ?)
      `).run(
        data.optimization.periodDays,
        data.optimization.beamWidth,
        data.optimization.maxSteps,
      );
    },
  );

  transaction(world);
}
