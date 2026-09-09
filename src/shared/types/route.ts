import type { Duration } from "./common";

export interface Route {
  id: string;
  from: string;
  to: string;
  travelTime: Duration;
}