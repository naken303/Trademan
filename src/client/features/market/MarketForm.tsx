import { useState } from "react";

import type {
  Market,
  Product,
  Village,
} from "../../../shared/types";

interface MarketFormProps {
  villages: Village[];
  products: Product[];
  market?: Market | null;
  onSubmit: (market: Omit<Market, "id">) => Promise<void>;
  onCancel: () => void;
}

interface FormState {
  villageId: string;
  productId: string;
  side: "supply" | "demand";
  unitPrice: string;
  initialQuantity: string;
}

function createInitialForm(
  market?: Market | null,
): FormState {
  return {
    villageId: market?.villageId ?? "",
    productId: market?.productId ?? "",
    side: market?.side ?? "supply",
    unitPrice:
      market !== undefined && market !== null
        ? String(market.unitPrice)
        : "",
    initialQuantity:
      market !== undefined && market !== null
        ? String(market.initialQuantity)
        : "",
  };
}

export function MarketForm({
  villages,
  products,
  market,
  onSubmit,
  onCancel,
}: MarketFormProps) {
  const [form, setForm] = useState<FormState>(
    createInitialForm(market),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    if (!form.villageId) {
      setError("Select a village.");
      return;
    }

    if (!form.productId) {
      setError("Select a product.");
      return;
    }

    const unitPrice = Number(form.unitPrice);
    const initialQuantity = Number(
      form.initialQuantity,
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      setError("Unit price must be greater than zero.");
      return;
    }

    if (
      !Number.isInteger(initialQuantity) ||
      initialQuantity <= 0
    ) {
      setError(
        "Initial quantity must be a positive whole number.",
      );
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        villageId: form.villageId,
        productId: form.productId,
        side: form.side,
        unitPrice,
        initialQuantity,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save market",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="market-form"
      onSubmit={handleSubmit}
    >
      <div className="market-form-field">
        <label htmlFor="market-village">
          Village
        </label>

        <select
          id="market-village"
          value={form.villageId}
          onChange={(event) =>
            updateField(
              "villageId",
              event.target.value,
            )
          }
        >
          <option value="">
            Select village
          </option>

          {villages.map((village) => (
            <option
              key={village.id}
              value={village.id}
            >
              {village.name} ({village.id})
            </option>
          ))}
        </select>
      </div>

      <div className="market-form-field">
        <label htmlFor="market-product">
          Product
        </label>

        <select
          id="market-product"
          value={form.productId}
          onChange={(event) =>
            updateField(
              "productId",
              event.target.value,
            )
          }
        >
          <option value="">
            Select product
          </option>

          {products.map((product) => (
            <option
              key={product.id}
              value={product.id}
            >
              {product.name} ({product.id})
            </option>
          ))}
        </select>
      </div>

      <div className="market-form-field">
        <label htmlFor="market-side">
          Market Side
        </label>

        <select
          id="market-side"
          value={form.side}
          onChange={(event) =>
            updateField(
              "side",
              event.target.value as
                | "supply"
                | "demand",
            )
          }
        >
          <option value="supply">
            Supply — village sells to player
          </option>

          <option value="demand">
            Demand — village buys from player
          </option>
        </select>
      </div>

      <div className="market-form-field">
        <label htmlFor="market-price">
          Unit Price
        </label>

        <input
          id="market-price"
          type="number"
          min="0.01"
          step="0.01"
          value={form.unitPrice}
          onChange={(event) =>
            updateField(
              "unitPrice",
              event.target.value,
            )
          }
          placeholder="For example, 20"
        />
      </div>

      <div className="market-form-field">
        <label htmlFor="market-quantity">
          Initial Quantity
        </label>

        <input
          id="market-quantity"
          type="number"
          min="1"
          step="1"
          value={form.initialQuantity}
          onChange={(event) =>
            updateField(
              "initialQuantity",
              event.target.value,
            )
          }
          placeholder="For example, 20"
        />
      </div>

      {error && (
        <div className="market-form-error">
          {error}
        </div>
      )}

      <div className="market-form-actions">
        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : market
              ? "Save changes"
              : "Add Market"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
