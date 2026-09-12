import type { Duration, Position } from "./common";

export interface VillageReset {
  afterReset: Duration;
}

export interface RunInitialization {
  villageResetRemaining: Record<string, Duration>;
}

export interface VillageVisual {
  icon?: string | null;
  image?: string | null;
}

export interface Village {
  id: string;
  name: string;
  position: Position;
  visual?: VillageVisual;
  initialReserveMoney: number;
  reset: VillageReset;
}
