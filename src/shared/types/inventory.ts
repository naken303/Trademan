export interface InventoryItem {
  productId: string;
  quantity: number;
}

export interface PlayerInventory {
  items: InventoryItem[];
  capacityCrates: number;
}