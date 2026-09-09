import type {
  Market,
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
): SimulationState {
  const villages: Record<string, SimulationState["villages"][string]> =
    {};

  for (const village of world.villages) {
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
          ...village.reset.current,
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
