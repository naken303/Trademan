import type { Product } from "../../../shared/types";
import { db } from "../connection";

interface ProductRow {
  id: string;
  name: string;
  category: string | null;
  units_per_crate: number;
  base_supply_price: number | null;
  base_demand_price: number | null;
  image_path: string | null;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    ...(row.category !== null
      ? { category: row.category }
      : {}),
    unitsPerCrate: row.units_per_crate,
    ...(row.base_supply_price !== null
      ? { baseSupplyPrice: row.base_supply_price }
      : {}),
    ...(row.base_demand_price !== null
      ? { baseDemandPrice: row.base_demand_price }
      : {}),
    ...(row.image_path !== null
      ? {
          image: {
            type: "file",
            path: row.image_path,
          },
        }
      : {}),
  };
}

export function getAllProducts(): Product[] {
  const rows = db
    .prepare(
      `
        SELECT
          id,
          name,
          category,
          units_per_crate,
          base_supply_price,
          base_demand_price,
          image_path
        FROM products
        ORDER BY name
      `,
    )
    .all() as ProductRow[];

  return rows.map(rowToProduct);
}

export function getProductById(
  productId: string,
): Product | null {
  const row = db
    .prepare(
      `
        SELECT
          id,
          name,
          category,
          units_per_crate,
          base_supply_price,
          base_demand_price,
          image_path
        FROM products
        WHERE id = ?
      `,
    )
    .get(productId) as ProductRow | undefined;

  return row ? rowToProduct(row) : null;
}

export function createProduct(product: Product): void {
  const statement = db.prepare(
    `
      INSERT INTO products (
        id,
        name,
        category,
        units_per_crate,
        base_supply_price,
        base_demand_price,
        image_path
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
  );

  statement.run(
    product.id,
    product.name,
    product.category ?? null,
    product.unitsPerCrate,
    product.baseSupplyPrice ?? null,
    product.baseDemandPrice ?? null,
    product.image?.path ?? null,
  );
}

export function updateProduct(product: Product): void {
  const statement = db.prepare(
    `
      UPDATE products
      SET
        name = ?,
        category = ?,
        units_per_crate = ?,
        base_supply_price = ?,
        base_demand_price = ?,
        image_path = ?
      WHERE id = ?
    `,
  );

  const result = statement.run(
    product.name,
    product.category ?? null,
    product.unitsPerCrate,
    product.baseSupplyPrice ?? null,
    product.baseDemandPrice ?? null,
    product.image?.path ?? null,
    product.id,
  );

  if (result.changes === 0) {
    throw new Error(`Product not found: ${product.id}`);
  }
}

export function deleteProduct(productId: string): void {
  const statement = db.prepare(
    `
      DELETE FROM products
      WHERE id = ?
    `,
  );

  const result = statement.run(productId);

  if (result.changes === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
}

export function createProductWithGeneratedId(product: Omit<Product, "id">): Product {
  return db.transaction(() => {
    while (true) {
      const row = db.prepare("SELECT next_value FROM product_id_sequence WHERE id = 1").get() as { next_value: number };
      db.prepare("UPDATE product_id_sequence SET next_value = next_value + 1 WHERE id = 1").run();
      const created = { ...product, id: `P${String(row.next_value).padStart(6, "0")}` };
      if (!getProductById(created.id)) {
        createProduct(created);
        return created;
      }
    }
  })();
}
