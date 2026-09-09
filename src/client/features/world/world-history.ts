import type { Position } from "../../../shared/types";

export interface VillagePositionChange {
  villageId: string;
  from: Position;
  to: Position;
}