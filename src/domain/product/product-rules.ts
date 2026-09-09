import type { Product } from "../../shared/types";

export function getCratesRequired(
  product: Product,
  quantity: number,
): number {
  if (quantity <= 0) {
    return 0;
  }

  return Math.ceil(quantity / product.unitsPerCrate);
}