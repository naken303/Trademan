import type {
  Duration,
  RuntimeVillage,
} from "../../shared/types";

function durationToHours(
  duration: Duration,
): number {
  return duration.days * 24 + duration.hours;
}

function hoursToDuration(
  hours: number,
): Duration {
  return {
    days: Math.floor(hours / 24),
    hours: hours % 24,
  };
}

export function advanceVillageReset(
  village: RuntimeVillage,
  elapsedHours: number,
): RuntimeVillage {
  if (elapsedHours < 0) {
    throw new Error(
      "Elapsed hours cannot be negative",
    );
  }

  let remainingHours = durationToHours(
    village.reset.current,
  );

  const afterResetHours = durationToHours(
    village.resetAfterReset,
  );

  let money = village.money;
  let markets = village.markets;

  while (elapsedHours >= remainingHours) {
    elapsedHours -= remainingHours;

    money = village.initialReserveMoney;

    markets = Object.fromEntries(
      Object.entries(village.initialMarkets).map(
        ([marketId, market]) => [
          marketId,
          {
            quantity: market.quantity,
          },
        ],
      ),
    );

    remainingHours = afterResetHours;
  }

  remainingHours -= elapsedHours;

  return {
    ...village,

    money,

    markets,

    reset: {
      current: hoursToDuration(
        remainingHours,
      ),
    },
  };
}