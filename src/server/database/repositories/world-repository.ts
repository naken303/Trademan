import type { WorldData } from "../../../shared/types";

import { getAllMarkets } from "./market-repository";
import { getAllProducts } from "./product-repository";
import { getAllRoutes } from "./route-repository";
import { getAllVillages } from "./village-repository";

import { db } from "../connection";

export function getWorld(): WorldData {
  const settings = db
    .prepare(`
      SELECT
        schema_version,
        currency,
        simulation_start_day,
        simulation_start_hour
      FROM world_settings
      WHERE id = 1
    `)
    .get() as
    | {
        schema_version: number;
        currency: string;
        simulation_start_day: number;
        simulation_start_hour: number;
      }
    | undefined;

  if (!settings) {
    throw new Error("World settings have not been initialized");
  }

  const player = db
    .prepare(
      `
      SELECT
        current_village_id,
        money,
        inventory_capacity_crates,
        continuous_mode
      FROM player_settings
      WHERE id = 1
      `,
    )
    .get() as
    | {
        current_village_id: string;
        money: number;
        inventory_capacity_crates: number;
        continuous_mode: number;
      }
    | undefined;

  if (!player) {
    throw new Error(
      "Player settings have not been initialized",
    );
  }

  const optimization = db
    .prepare(
      `
      SELECT
        period_days,
        beam_width,
        max_steps
      FROM optimization_settings
      WHERE id = 1
      `,
    )
    .get() as
    | {
        period_days: number;
        beam_width: number;
        max_steps: number;
      }
    | undefined;

  if (!optimization) {
    throw new Error(
      "Optimization settings have not been initialized",
    );
  }

  const initialInventory = db
    .prepare(`
      SELECT product_id, quantity
      FROM player_initial_inventory
      ORDER BY product_id
    `)
    .all() as Array<{ product_id: string; quantity: number }>;

  return {
    schemaVersion: settings.schema_version,

    settings: {
      currency: settings.currency,
    },

    player: {
      currentVillageId:
        player.current_village_id,

      money: player.money,

      inventoryCapacityCrates:
        player.inventory_capacity_crates,

      continuousMode:
        player.continuous_mode === 1,

      initialInventory: initialInventory.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
      })),
    },

    simulation: {
      startDay: settings.simulation_start_day,
      startHour: settings.simulation_start_hour,
    },

    optimization: {
      periodDays:
        optimization.period_days,

      beamWidth:
        optimization.beam_width,

      maxSteps:
        optimization.max_steps,
    },

    products: getAllProducts(),
    villages: getAllVillages(),
    routes: getAllRoutes(),
    markets: getAllMarkets(),
  };
}
