import type { SimulationState } from "../shared/types";

function sortedRecord(record: Record<string, number>) {
  return Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
}

export function createOptimizerStateSignature(state: SimulationState): string {
  const villages = Object.entries(state.villages)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([villageId, village]) => [
      villageId,
      village.reset.current.days,
      village.reset.current.hours,
      village.money,
      Object.entries(village.markets)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([marketId, market]) => [marketId, market.quantity]),
    ]);

  return JSON.stringify({
    time: [state.time.day, state.time.hour],
    location: state.player.location,
    money: state.player.money,
    inventory: [...state.player.inventory]
      .sort((left, right) => left.productId.localeCompare(right.productId))
      .map((item) => [item.productId, item.quantity]),
    inventoryCost: sortedRecord(state.player.inventoryCost),
    villages,
    accumulatedProfit: state.accumulatedProfit,
  });
}
