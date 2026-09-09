import type {
  InventoryItem,
  Product,
} from "../../shared/types";

import {
  addInventory,
  removeInventory,
} from "../../domain/inventory";

import {
  canAddInventory,
  getInventoryCrates,
} from "../../domain/inventory";

export function addToInventory(
  items: InventoryItem[],
  product: Product,
  quantity: number,
  products: Product[],
  capacityCrates: number,
): InventoryItem[] {
  if (
    !canAddInventory(
      items,
      product,
      quantity,
      products,
      capacityCrates,
    )
  ) {
    throw new Error(
      "Inventory capacity exceeded",
    );
  }

  return addInventory(
    items,
    product.id,
    quantity,
  );
}

export function removeFromInventory(
  items: InventoryItem[],
  productId: string,
  quantity: number,
): InventoryItem[] {
  return removeInventory(
    items,
    productId,
    quantity,
  );
}

export function getUsedCrates(
  items: InventoryItem[],
  products: Product[],
): number {
  return getInventoryCrates(
    items,
    products,
  );
}