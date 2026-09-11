import { useState } from "react";

import type { Product } from "../../../shared/types";

interface ProductFormProps {
  product?: Product;
  loading: boolean;
  onSubmit: (
    product: Product,
    imageFile?: File,
  ) => Promise<void>;
  onCancel: () => void;
}

interface ProductFormState {
  id: string;
  name: string;
  category: string;
  unitsPerCrate: string;
  baseSupplyPrice: string;
  baseDemandPrice: string;
}

function createInitialState(
  product?: Product,
): ProductFormState {
  return {
    id: product?.id ?? "",
    name: product?.name ?? "",
    category: product?.category ?? "",
    unitsPerCrate: product?.unitsPerCrate
      ? String(product.unitsPerCrate)
      : "20",
    baseSupplyPrice: product?.baseSupplyPrice !== undefined
      ? String(product.baseSupplyPrice)
      : "",
    baseDemandPrice: product?.baseDemandPrice !== undefined
      ? String(product.baseDemandPrice)
      : "",
  };
}

export function ProductForm({
  product,
  loading,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<ProductFormState>(
    () => createInitialState(product),
  );

  const [imageFile, setImageFile] =
    useState<File | undefined>();

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const isEditing = product !== undefined;

  function updateField(
    field: keyof ProductFormState,
    value: string,
  ) {
    setForm((state) => ({
      ...state,
      [field]: value,
    }));
  }

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageFile(undefined);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setValidationError(
        "Only JPG, PNG, WEBP, and GIF images are allowed.",
      );

      event.target.value = "";
      setImageFile(undefined);

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setValidationError(
        "Image size must not exceed 5 MB.",
      );

      event.target.value = "";
      setImageFile(undefined);

      return;
    }

    setValidationError(null);
    setImageFile(file);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const id = form.id.trim();
    const name = form.name.trim();
    const category = form.category.trim();

    const unitsPerCrate = Number(
      form.unitsPerCrate,
    );
    const baseSupplyPrice = form.baseSupplyPrice === ""
      ? undefined
      : Number(form.baseSupplyPrice);
    const baseDemandPrice = form.baseDemandPrice === ""
      ? undefined
      : Number(form.baseDemandPrice);

    if (!id) {
      setValidationError(
        "Product ID is required.",
      );
      return;
    }

    if (!name) {
      setValidationError(
        "Product name is required.",
      );
      return;
    }

    if (
      !Number.isInteger(unitsPerCrate) ||
      unitsPerCrate <= 0
    ) {
      setValidationError(
        "Units per crate must be a positive integer.",
      );
      return;
    }

    if (baseSupplyPrice !== undefined && (!Number.isFinite(baseSupplyPrice) || baseSupplyPrice <= 0)) {
      setValidationError("Base Supply Price must be positive when provided.");
      return;
    }

    if (baseDemandPrice !== undefined && (!Number.isFinite(baseDemandPrice) || baseDemandPrice <= 0)) {
      setValidationError("Base Demand Price must be positive when provided.");
      return;
    }

    setValidationError(null);

    const nextProduct: Product = {
      id,
      name,
      ...(category
        ? {
            category,
          }
        : {}),
      unitsPerCrate,
      ...(baseSupplyPrice !== undefined ? { baseSupplyPrice } : {}),
      ...(baseDemandPrice !== undefined ? { baseDemandPrice } : {}),
      ...(product?.image ? { image: product.image } : {}),
    };

    await onSubmit(nextProduct, imageFile);
  }

  return (
    <form
      className="product-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <h2 style={{ margin: 0 }}>
        {isEditing ? "Edit Product" : "Add Product"}
      </h2>

      {validationError && (
        <div className="product-form-error" role="alert">
          {validationError}
        </div>
      )}

      <label>
        <div>Product ID</div>

        <input
          value={form.id}
          onChange={(event) =>
            updateField(
              "id",
              event.target.value,
            )
          }
          disabled={isEditing || loading}
          placeholder="e.g. MILK"
        />
      </label>

      <label>
        <div>Name</div>

        <input
          value={form.name}
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
          disabled={loading}
          placeholder="e.g. Milk"
        />
      </label>

      <label>
        <div>Category</div>

        <input
          value={form.category}
          onChange={(event) =>
            updateField(
              "category",
              event.target.value,
            )
          }
          disabled={loading}
          placeholder="e.g. Food"
        />
      </label>

      <label>
        <div>Units per crate</div>

        <input
          type="number"
          min="1"
          step="1"
          value={form.unitsPerCrate}
          onChange={(event) =>
            updateField(
              "unitsPerCrate",
              event.target.value,
            )
          }
          disabled={loading}
        />
      </label>

      <label>
        <div>Base Supply Price</div>
        <input
          type="number"
          min="0.01"
          step="any"
          value={form.baseSupplyPrice}
          onChange={(event) => updateField("baseSupplyPrice", event.target.value)}
          disabled={loading}
          placeholder="Optional"
        />
        <small>Default price when this product is added as Supply. Existing markets are not changed.</small>
      </label>

      <label>
        <div>Base Demand Price</div>
        <input
          type="number"
          min="0.01"
          step="any"
          value={form.baseDemandPrice}
          onChange={(event) => updateField("baseDemandPrice", event.target.value)}
          disabled={loading}
          placeholder="Optional"
        />
        <small>Default price when this product is added as Demand. Existing markets are not changed.</small>
      </label>

      <label>
        <div>Product image</div>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          disabled={loading}
        />
      </label>

      {product?.image?.path && (
        <div>
          <div
            style={{
              fontSize: "13px",
              marginBottom: "6px",
            }}
          >
            Current image
          </div>

          <img
            src={`/${product.image.path}`}
            alt={product.name}
            style={{
              width: "100px",
              height: "100px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
        </div>
      )}

      {imageFile && (
        <div
          style={{
            fontSize: "13px",
          }}
        >
          Selected: <strong>{imageFile.name}</strong>
        </div>
      )}

      <div className="product-form-actions">
        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : isEditing
              ? "Save changes"
              : "Add Product"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
