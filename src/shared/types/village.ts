import type { Duration, Position } from "./common";

export interface VillageReset {
  current: Duration;
  afterReset: Duration;
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