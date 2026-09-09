import { create } from "zustand";

import type { Product } from "../../../shared/types";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "./product-api";

interface ProductStore {
  products: Product[];

  loading: boolean;
  error: string | null;

  loadProducts: () => Promise<void>;

  addProduct: (product: Product) => Promise<void>;

  editProduct: (product: Product) => Promise<void>;

  removeProduct: (productId: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>(
  (set) => ({
    products: [],

    loading: false,
    error: null,

    loadProducts: async () => {
      set({
        loading: true,
        error: null,
      });

      try {
        const products = await getProducts();

        set({
          products,
          loading: false,
          error: null,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load products",
        });
      }
    },

    addProduct: async (product) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const createdProduct =
          await createProduct(product);

        set((state) => ({
          products: [
            ...state.products,
            createdProduct,
          ].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
          loading: false,
          error: null,
        }));
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create product",
        });

        throw error;
      }
    },

    editProduct: async (product) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const updatedProduct =
          await updateProduct(product);

        set((state) => ({
          products: state.products
            .map((item) =>
              item.id === updatedProduct.id
                ? updatedProduct
                : item,
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          loading: false,
          error: null,
        }));
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update product",
        });

        throw error;
      }
    },

    removeProduct: async (productId) => {
      set({
        loading: true,
        error: null,
      });

      try {
        await deleteProduct(productId);

        set((state) => ({
          products: state.products.filter(
            (product) => product.id !== productId,
          ),
          loading: false,
          error: null,
        }));
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete product",
        });

        throw error;
      }
    },
  }),
);