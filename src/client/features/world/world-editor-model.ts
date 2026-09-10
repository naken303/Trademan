import type { Market, WorldData } from "../../../shared/types";

export type ProductPaletteMode = "images" | "details";

export interface MarketAssignmentDraft {
  price: string;
  quantity: string;
}

export function normalizeProductPaletteMode(value: string | null): ProductPaletteMode {
  return value === "details" ? "details" : "images";
}

export function getMarketAssignmentDraft(
  world: WorldData,
  villageId: string,
  productId: string,
  side: Market["side"],
): MarketAssignmentDraft {
  const existing = world.markets.find((market) =>
    market.villageId === villageId && market.productId === productId && market.side === side,
  );
  const product = world.products.find((item) => item.id === productId);
  const basePrice = side === "supply" ? product?.baseSupplyPrice : product?.baseDemandPrice;
  return {
    price: String(existing?.unitPrice ?? basePrice ?? ""),
    quantity: String(existing?.initialQuantity ?? ""),
  };
}
