import type { MarketSide } from "./common";

export interface Market {
  id: string;
  villageId: string;
  productId: string;
  side: MarketSide;
  unitPrice: number;
  initialQuantity: number;
}