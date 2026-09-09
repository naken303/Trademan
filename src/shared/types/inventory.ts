export interface InventoryItem {
  productId: string;
  quantity: number;
}

export interface InitialInventoryItem extends InventoryItem {
  unitCost: number;
}

export interface PlayerInventory {
  items: InventoryItem[];
  capacityCrates: number;
}
