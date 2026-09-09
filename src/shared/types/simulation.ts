import type { InventoryItem } from "./inventory";

export interface SimulationTime {
  day: number;
  hour: number;
}

export interface RuntimeMarket {
  quantity: number;
}

export interface RuntimeVillage {
  initialReserveMoney: number;

  initialMarkets: Record<
    string,
    RuntimeMarket
  >;

  money: number;

  reset: {
    current: {
      days: number;
      hours: number;
    };
  };

  resetAfterReset: {
    days: number;
    hours: number;
  };

  markets: Record<string, RuntimeMarket>;
}

export interface SimulationState {
  time: SimulationTime;

  player: {
    location: string;
    money: number;
    inventory: InventoryItem[];
    inventoryCost: Record<string, number>;
  };

  villages: Record<string, RuntimeVillage>;

  accumulatedProfit: number;
}