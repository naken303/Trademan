import type { InitialInventoryItem } from "./inventory";

export interface PlayerSettings {
  currentVillageId: string;
  money: number;
  inventoryCapacityCrates: number;
  continuousMode: boolean;
  initialInventory: InitialInventoryItem[];
}
