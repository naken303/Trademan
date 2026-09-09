import type { InventoryItem } from "../../shared/types";

export function addInventory(
  items: InventoryItem[],
  productId: string,
  quantity: number,
): InventoryItem[] {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    throw new Error(
      "Inventory quantity must be a positive integer",
    );
  }

  const existing = items.find(
    (item) =>
      item.productId === productId,
  );

  if (existing) {
    return items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity:
              item.quantity + quantity,
          }
        : item,
    );
  }

  return [
    ...items,
    {
      productId,
      quantity,
    },
  ];
}

export function removeInventory(
  items: InventoryItem[],
  productId: string,
  quantity: number,
): InventoryItem[] {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    throw new Error(
      "Inventory quantity must be a positive integer",
    );
  }

  const existing = items.find(
    (item) =>
      item.productId === productId,
  );

  if (
    !existing ||
    existing.quantity < quantity
  ) {
    throw new Error(
      "Insufficient inventory",
    );
  }

  const remaining =
    existing.quantity - quantity;

  if (remaining === 0) {
    return items.filter(
      (item) =>
        item.productId !== productId,
    );
  }

  return items.map((item) =>
    item.productId === productId
      ? {
          ...item,
          quantity: remaining,
        }
      : item,
  );
}