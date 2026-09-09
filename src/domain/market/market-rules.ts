import type { Market } from "../../shared/types";

export function findMarket(
  markets: Market[],
  villageId: string,
  productId: string,
  side: "supply" | "demand",
): Market | undefined {
  return markets.find(
    (market) =>
      market.villageId === villageId &&
      market.productId === productId &&
      market.side === side,
  );
}

export function canBuy(
  market: Market | undefined,
  quantity: number,
): boolean {
  if (!market) {
    return false;
  }

  return (
    market.side === "supply" &&
    quantity > 0 &&
    quantity <= market.initialQuantity
  );
}

export function canSell(
  market: Market | undefined,
  quantity: number,
): boolean {
  if (!market) {
    return false;
  }

  return (
    market.side === "demand" &&
    quantity > 0 &&
    quantity <= market.initialQuantity
  );
}