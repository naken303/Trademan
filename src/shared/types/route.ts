import type { Duration } from "./common";

export interface Route {
  id: string;
  from: string;
  to: string;
  travelTime: Duration;
  reverseTravelTime?: Duration;
  /** Omitted routes retain the legacy/default bidirectional behavior. */
  returnAvailable?: boolean;
}
