import type { Market } from "../../../shared/types";
import { db } from "../connection";

interface MarketRow {
  id: string;
  village_id: string;
  product_id: string;
  side: "supply" | "demand";
  unit_price: number;
  initial_quantity: number;
}

function rowToMarket(row: MarketRow): Market {
  return {
    id: row.id,
    villageId: row.village_id,
    productId: row.product_id,
    side: row.side,
    unitPrice: row.unit_price,
    initialQuantity: row.initial_quantity,
  };
}

export function getAllMarkets(): Market[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          village_id,
          product_id,
          side,
          unit_price,
          initial_quantity
        FROM markets
        ORDER BY village_id, side, product_id
      `,
    )
    .all() as MarketRow[];

  return rows.map(rowToMarket);
}

export function getMarketById(
  marketId: string,
): Market | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          village_id,
          product_id,
          side,
          unit_price,
          initial_quantity
        FROM markets
        WHERE id = ?
      `,
    )
    .get(marketId) as MarketRow | undefined;

  return row ? rowToMarket(row) : null;
}

export function createMarket(
  market: Market,
): void {
  const statement = db.prepare(
    `
      INSERT INTO markets (
        id,
        village_id,
        product_id,
        side,
        unit_price,
        initial_quantity
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  );

  statement.run(
    market.id,
    market.villageId,
    market.productId,
    market.side,
    market.unitPrice,
    market.initialQuantity,
  );
}

export function updateMarket(
  market: Market,
): void {
  const statement = db.prepare(
    `
      UPDATE markets
      SET
        village_id = ?,
        product_id = ?,
        side = ?,
        unit_price = ?,
        initial_quantity = ?
      WHERE id = ?
    `,
  );

  const result = statement.run(
    market.villageId,
    market.productId,
    market.side,
    market.unitPrice,
    market.initialQuantity,
    market.id,
  );

  if (result.changes === 0) {
    throw new Error(
      `Market not found: ${market.id}`,
    );
  }
}

export function deleteMarket(
  marketId: string,
): void {
  const statement = db.prepare(
    `
      DELETE FROM markets
      WHERE id = ?
    `,
  );

  const result = statement.run(marketId);

  if (result.changes === 0) {
    throw new Error(
      `Market not found: ${marketId}`,
    );
  }
}

export function getMarketByLogicalKey(villageId: string, productId: string, side: Market["side"]): Market | null {
  return getAllMarkets().find((market) => market.villageId === villageId && market.productId === productId && market.side === side) ?? null;
}
