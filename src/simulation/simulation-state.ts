import type {
  Market,
  RunInitialization,
  SimulationState,
  WorldData,
} from "../shared/types";

function buildVillageMarkets(
  villageId: string,
  markets: Market[],
) {
  return Object.fromEntries(
    markets
      .filter(
        (market) =>
          market.villageId === villageId,
      )
      .map((market) => [
        market.id,
        {
          quantity: market.initialQuantity,
        },
      ]),
  );
}

export function createInitialSimulationState(
  world: WorldData,
  initialization: RunInitialization = {
    villageResetRemaining: Object.fromEntries(
      world.villages.map((village) => [village.id, village.reset.afterReset]),
    ),
  },
): SimulationState {
  const villages: Record<string, SimulationState["villages"][string]> =
    {};

  for (const village of world.villages) {
    const currentReset = initialization.villageResetRemaining[village.id];
    if (!currentReset) throw new Error(`Current reset remaining is required for village: ${village.id}`);
    const initialMarkets =
      buildVillageMarkets(
        village.id,
        world.markets,
      );

    villages[village.id] = {
      initialReserveMoney:
        village.initialReserveMoney,

      initialMarkets,

      money:
        village.initialReserveMoney,

      reset: {
        current: {
          ...currentReset,
        },
      },

      resetAfterReset: {
        ...village.reset.afterReset,
      },

      markets: structuredClone(
        initialMarkets,
      ),
    };
  }

  return {
    time: {
      day: world.simulation.startDay,
      hour: world.simulation.startHour,
    },

    player: {
      location:
        world.player.currentVillageId,
    
      money: world.player.money,
    
      inventory: world.player.initialInventory.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    
      inventoryCost: Object.fromEntries(
        world.player.initialInventory.map((item) => [
          item.productId,
          item.quantity * item.unitCost,
        ]),
      ),
    },

    villages,

    accumulatedProfit: 0,
  };
}
