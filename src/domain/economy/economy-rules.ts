export function calculatePurchaseCost(
  unitPrice: number,
  quantity: number,
): number {
  return unitPrice * quantity;
}

export function calculateSaleRevenue(
  unitPrice: number,
  quantity: number,
): number {
  return unitPrice * quantity;
}

export function calculateProfit(
  buyPrice: number,
  sellPrice: number,
  quantity: number,
): number {
  return (sellPrice - buyPrice) * quantity;
}