import type {
  InventoryItem,
  Product,
} from "../../shared/types";

import { getCratesRequired } from "../product/product-rules";

export function getInventoryCrates(
  items: InventoryItem[],
  products: Product[],
): number {
  return items.reduce((total, item) => {
    const product = products.find(
      (p) => p.id === item.productId,
    );

    if (!product) {
      throw new Error(
        `Unknown product: ${item.productId}`,
      );
    }

    return (
      total +
      getCratesRequired(
        product,
        item.quantity,
      )
    );
  }, 0);
}

export function canAddInventory(
  items: InventoryItem[],
  product: Product,
  quantity: number,
  products: Product[],
  capacityCrates: number,
): boolean {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    return false;
  }

  const existing = items.find(
    (item) =>
      item.productId === product.id,
  );

  const nextItems = items.map((item) =>
    item.productId === product.id
      ? {
          ...item,
          quantity:
            item.quantity + quantity,
        }
      : item,
  );

  if (!existing) {
    nextItems.push({
      productId: product.id,
      quantity,
    });
  }

  return (
    getInventoryCrates(
      nextItems,
      products,
    ) <= capacityCrates
  );
}

export function hasInventory(
  items: InventoryItem[],
  productId: string,
  quantity: number,
): boolean {
  if (
    quantity <= 0 ||
    !Number.isInteger(quantity)
  ) {
    return false;
  }

  const item = items.find(
    (entry) =>
      entry.productId === productId,
  );

  return (
    item !== undefined &&
    item.quantity >= quantity
  );
}