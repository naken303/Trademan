import { useEffect, useState } from "react";

import type { Product } from "../../../shared/types";
import {
  deleteProductImage,
  uploadProductImage,
} from "./product-api";
import { ProductForm } from "./ProductForm";
import { useProductStore } from "./product-store";

function getProductImageUrl(
  product: Product,
): string | null {
  if (!product.image?.path) {
    return null;
  }

  return `/${product.image.path}?v=${encodeURIComponent(
    product.image.path,
  )}&t=${Date.now()}`;
}

export function ProductsPage() {
  const products = useProductStore(
    (state) => state.products,
  );

  const loading = useProductStore(
    (state) => state.loading,
  );

  const error = useProductStore(
    (state) => state.error,
  );

  const loadProducts = useProductStore(
    (state) => state.loadProducts,
  );

  const addProduct = useProductStore(
    (state) => state.addProduct,
  );

  const editProduct = useProductStore(
    (state) => state.editProduct,
  );

  const removeProduct = useProductStore(
    (state) => state.removeProduct,
  );

  const [editingProduct, setEditingProduct] =
    useState<Product | undefined>();

  const [showForm, setShowForm] = useState(false);

  const [imageActionLoading, setImageActionLoading] =
    useState(false);

  const [pageError, setPageError] =
    useState<string | null>(null);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function handleAdd() {
    setEditingProduct(undefined);
    setPageError(null);
    setShowForm(true);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setPageError(null);
    setShowForm(true);
  }

  function handleCancel() {
    setEditingProduct(undefined);
    setShowForm(false);
    setPageError(null);
  }

  async function handleSubmit(
    product: Product,
    imageFile?: File,
  ) {
    try {
      setPageError(null);

      if (editingProduct) {
        await editProduct(product);
      } else {
        await addProduct(product);
      }

      if (imageFile) {
        setImageActionLoading(true);

        await uploadProductImage(
          product.id,
          imageFile,
        );
      }

      await loadProducts();

      setEditingProduct(undefined);
      setShowForm(false);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to save product",
      );
    } finally {
      setImageActionLoading(false);
    }
  }

  async function handleDelete(
    product: Product,
  ) {
    const confirmed = window.confirm(
      `Delete product "${product.name}" (${product.id})?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError(null);

      await removeProduct(product.id);

      await loadProducts();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to delete product",
      );
    }
  }

  async function handleDeleteImage(
    product: Product,
  ) {
    const confirmed = window.confirm(
      `Remove image from "${product.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setPageError(null);
      setImageActionLoading(true);

      await deleteProductImage(product.id);

      await loadProducts();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to remove product image",
      );
    } finally {
      setImageActionLoading(false);
    }
  }

  const busy =
    loading || imageActionLoading;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "4px" }}>
            Products
          </h1>

          <div>
            Total products:{" "}
            <strong>{products.length}</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
        >
          Add Product
        </button>
      </div>

      {(error || pageError) && (
        <div
          style={{
            marginBottom: "16px",
            padding: "10px",
            border: "1px solid #cc0000",
            borderRadius: "6px",
          }}
        >
          {pageError ?? error}
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editingProduct}
          loading={busy}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )}

      {loading && products.length === 0 ? (
        <div>Loading products...</div>
      ) : products.length === 0 ? (
        <div>No products found.</div>
      ) : (
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  Image
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  ID
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  Name
                </th>

                <th
                  style={{
                    textAlign: "left",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  Category
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  Units / Crate
                </th>

                <th
                  style={{
                    textAlign: "right",
                    padding: "8px",
                    borderBottom:
                      "1px solid #ccc",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const imageUrl =
                  getProductImageUrl(product);

                return (
                  <tr key={product.id}>
                    <td
                      style={{
                        padding: "8px",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "6px",
                          }}
                        />
                      ) : (
                        <span>-</span>
                      )}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {product.id}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {product.name}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {product.category ?? "-"}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      {product.unitsPerCrate}
                    </td>

                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        borderBottom:
                          "1px solid #eee",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(product)
                        }
                        disabled={busy}
                        style={{
                          marginRight: "8px",
                        }}
                      >
                        Edit
                      </button>

                      {product.image?.path && (
                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteImage(
                              product,
                            )
                          }
                          disabled={busy}
                          style={{
                            marginRight: "8px",
                          }}
                        >
                          Remove Image
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(product)
                        }
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}