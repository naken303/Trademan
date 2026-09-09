import type { WorldData } from "../../../shared/types";

import { getAllMarkets } from "./market-repository";
import { getAllProducts } from "./product-repository";
import { getAllRoutes } from "./route-repository";
import { getAllVillages } from "./village-repository";

import { db } from "../connection";

export function getWorld(): WorldData {
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

  return {
    schemaVersion: 1,

    settings: {
      currency: "THB",
    },

    player: {
      currentVillageId:
        player.current_village_id,

      money: player.money,

      inventoryCapacityCrates:
        player.inventory_capacity_crates,

      continuousMode:
        player.continuous_mode === 1,

      initialInventory: [],
    },

    simulation: {
      startDay: 1,
      startHour: 0,
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