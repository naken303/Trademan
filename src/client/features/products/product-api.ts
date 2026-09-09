import { z } from "zod";

import { productSchema } from "../../../shared/schemas";
import type { Product } from "../../../shared/types";

const productsSchema = z.array(productSchema);

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const data: unknown = await response
    .json()
    .catch(() => null);

  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return fallback;
}

export async function getProducts(): Promise<Product[]> {
  const response = await fetch("/api/products");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to load products: ${response.status}`,
      ),
    );
  }

  const data: unknown = await response.json();

  return productsSchema.parse(data);
}

export async function createProduct(
  product: Product,
): Promise<Product> {
  const response = await fetch("/api/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to create product: ${response.status}`,
      ),
    );
  }

  const data: unknown = await response.json();

  return productSchema.parse(data);
}

export async function updateProduct(
  product: Product,
): Promise<Product> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(product.id)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to update product: ${response.status}`,
      ),
    );
  }

  const data: unknown = await response.json();

  return productSchema.parse(data);
}

export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<Product> {
  const formData = new FormData();

  formData.append("image", file);

  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/image`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to upload product image: ${response.status}`,
      ),
    );
  }

  const data: unknown = await response.json();

  return productSchema.parse(data);
}

export async function deleteProductImage(
  productId: string,
): Promise<void> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/image`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to delete product image: ${response.status}`,
      ),
    );
  }
}

export async function deleteProduct(
  productId: string,
): Promise<void> {
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Failed to delete product: ${response.status}`,
      ),
    );
  }
}