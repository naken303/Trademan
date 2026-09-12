import { useEffect, useState } from "react";

import type { Product } from "../../../shared/types";
import {
  deleteProductImage,
  uploadProductImage,
} from "./product-api";
import { ProductForm } from "./ProductForm";
import { useProductStore } from "./product-store";
import { getWorld } from "../world/world-api";
import { formatMoney } from "../../utils/format";
import "./ProductsPage.css";

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
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    void loadProducts();
    void getWorld()
      .then((world) => setCurrency(world.settings.currency))
      .catch(() => setCurrency(""));
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
    input: Omit<Product, "id">,
    imageFile?: File,
  ) {
    try {
      setPageError(null);

      if (editingProduct) {
        await editProduct({ ...input, id: editingProduct.id });
      } else {
        const created = await addProduct(input);
        if (imageFile) {
          setImageActionLoading(true);
          await uploadProductImage(created.id, imageFile);
        }
      }

      if (imageFile && editingProduct) {
        setImageActionLoading(true);

        await uploadProductImage(
          editingProduct.id,
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
      `Delete product "${product.name}"?`,
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
    <div className="products-page">
      <header className="products-heading">
        <div>
          <h1>Product Management</h1>
          <p>Manage products, crate sizes, images, and default market prices.</p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
        >
          + Add Product
        </button>
      </header>

      {(error || pageError) && (
        <div className="products-error" role="alert">
          {pageError ?? error}
        </div>
      )}

      {showForm && (
        <section className="products-panel products-form-panel"><ProductForm
            key={editingProduct?.id ?? "new"}
            product={editingProduct}
          loading={busy}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        /></section>
      )}

      {loading && products.length === 0 ? (
        <div className="products-panel page-state">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="products-panel products-empty">No products yet. Add a product to define trade goods and crate capacity.</div>
      ) : (
        <section className="products-panel">
          <div className="products-table-heading"><h2>Products</h2><span>{products.length} products</span></div>
          <div className="products-table-wrapper"><table className="products-table">
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

                <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ccc" }}>
                  Supply Default
                </th>

                <th style={{ textAlign: "right", padding: "8px", borderBottom: "1px solid #ccc" }}>
                  Demand Default
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
                    <td data-label="Image">
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

                    <td data-label="Name">
                      {product.name}
                    </td>

                    <td data-label="Category">
                      {product.category ?? "-"}
                    </td>

                    <td data-label="Units / crate" className="numeric">
                      {product.unitsPerCrate}
                    </td>

                    <td data-label="Supply default" className="numeric">
                      {product.baseSupplyPrice === undefined ? "—" : currency ? formatMoney(product.baseSupplyPrice, currency) : product.baseSupplyPrice.toLocaleString()}
                    </td>

                    <td data-label="Demand default" className="numeric">
                      {product.baseDemandPrice === undefined ? "—" : currency ? formatMoney(product.baseDemandPrice, currency) : product.baseDemandPrice.toLocaleString()}
                    </td>

                    <td data-label="Actions" className="product-actions">
                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(product)
                        }
                        disabled={busy}
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
          </table></div>
        </section>
      )}
    </div>
  );
}
