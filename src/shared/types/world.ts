import type { Market } from "./market";
import type { PlayerSettings } from "./player";
import type { Product } from "./product";
import type { Route } from "./route";
import type { Village } from "./village";

export interface WorldData {
  schemaVersion: number;

  settings: {
    currency: string;
  };

  player: PlayerSettings;

  simulation: {
    startDay: number;
    startHour: number;
  };

  optimization: {
    periodDays: number;
    beamWidth: number;
    maxSteps: number;
  };

  products: Product[];
  villages: Village[];
  routes: Route[];
  markets: Market[];
}