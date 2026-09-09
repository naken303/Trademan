import type { InventoryItem } from "./inventory";

export interface PlayerSettings {
  currentVillageId: string;
  money: number;
  inventoryCapacityCrates: number;
  continuousMode: boolean;
  initialInventory: InventoryItem[];
}