import { useState } from "react";

import type {
  Market,
  Product,
  Village,
} from "../../../shared/types";
import { cratesToUnits, unitsToCrates } from "../../../domain/market";

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
  crateQuantity: string;
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
    crateQuantity: "",
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
  const selectedProduct = products.find((product) => product.id === form.productId);

  function updateUnits(value: string) {
    const units = Number(value);
    updateField("initialQuantity", value);
    updateField("crateQuantity", selectedProduct && Number.isInteger(units) && units > 0 ? String(unitsToCrates(units, selectedProduct.unitsPerCrate)) : "");
  }

  function updateCrates(value: string) {
    updateField("crateQuantity", value);
    if (!selectedProduct || value === "") return;
    try { updateField("initialQuantity", String(cratesToUnits(Number(value), selectedProduct.unitsPerCrate))); }
    catch { updateField("initialQuantity", ""); }
  }

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
            setForm((current) => ({ ...current, productId: event.target.value, initialQuantity: "", crateQuantity: "" }))
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
              {product.name}
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
          Quantity (Units)
        </label>

        <input
          id="market-quantity"
          type="number"
          min="1"
          step="1"
          value={form.initialQuantity}
          onChange={(event) => updateUnits(event.target.value)}
          placeholder="For example, 20"
        />
      </div>
      <div className="market-form-field"><label htmlFor="market-crates">Quantity (Crates)</label><input id="market-crates" type="number" min="0.000001" step="any" value={form.crateQuantity || (selectedProduct && Number(form.initialQuantity) > 0 ? String(Number(form.initialQuantity) / selectedProduct.unitsPerCrate) : "")} onChange={(event) => updateCrates(event.target.value)} /></div>

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
