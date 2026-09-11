import { useEffect, useMemo, useState } from "react";

import type {
  Market,
  Product,
  Village,
} from "../../../shared/types";

import { getWorld } from "../world/world-api";

import {
  createMarket,
  deleteMarket,
  updateMarket,
} from "./market-api";

import { MarketForm } from "./MarketForm";

import "./MarketPage.css";
import { formatMoney } from "../../utils/format";

export function MarketPage() {
  const [villages, setVillages] = useState<Village[]>(
    [],
  );

  const [products, setProducts] = useState<Product[]>(
    [],
  );

  const [markets, setMarkets] = useState<Market[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  const [editingMarket, setEditingMarket] =
    useState<Market | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [selectedVillageId, setSelectedVillageId] =
    useState("all");

  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("");

  const villageMap = useMemo(
    () =>
      new Map(
        villages.map((village) => [
          village.id,
          village,
        ]),
      ),
    [villages],
  );

  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product,
        ]),
      ),
    [products],
  );

  const activeVillageId =
    selectedVillageId === "all" ||
    villages.some((village) => village.id === selectedVillageId)
      ? selectedVillageId
      : "all";

  const filteredMarkets =
    activeVillageId === "all"
      ? markets
      : markets.filter(
          (market) =>
            market.villageId ===
            activeVillageId,
        );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const world = await getWorld();

      setVillages(world.villages);
      setProducts(world.products);
      setMarkets(world.markets);
      setCurrency(world.settings.currency);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load markets",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  function handleAdd() {
    setError("");
    setEditingMarket(null);
    setShowForm(true);
  }

  function handleEdit(market: Market) {
    setError("");
    setEditingMarket(market);
    setShowForm(true);
  }

  async function handleDelete(market: Market) {
    const product =
      productMap.get(market.productId);

    const village =
      villageMap.get(market.villageId);

    const confirmed = window.confirm(
      `Delete ${product?.name ?? market.productId} market at ${village?.name ?? market.villageId}?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteMarket(market.id);
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete market",
      );
    }
  }

  async function handleSubmit(
    data: Omit<Market, "id">,
  ) {
    if (editingMarket) {
      await updateMarket(
        editingMarket.id,
        data,
      );
    } else {
      await createMarket(data);
    }

    setShowForm(false);
    setEditingMarket(null);

    await loadData();
  }

  function handleCancel() {
    setShowForm(false);
    setEditingMarket(null);
    setError("");
  }

  if (loading) {
    return (
      <div className="market-page">
        <div className="market-table-panel">
          Loading markets...
        </div>
      </div>
    );
  }

  return (
    <div className="market-page">
      <div className="market-page-header">
        <div>
          <h1>Market Management</h1>

          <p>
            Manage village supply and demand.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={
            villages.length === 0 ||
            products.length === 0
          }
        >
          + Add Market
        </button>
      </div>

      {error && (
        <div className="market-page-error">
          {error}
        </div>
      )}

      <div className="market-toolbar">
        <label htmlFor="market-village-filter">
          Village
        </label>

        <select
          id="market-village-filter"
          value={selectedVillageId}
          onChange={(event) =>
            setSelectedVillageId(
              event.target.value,
            )
          }
        >
          <option value="all">
            All villages
          </option>

          {villages.map((village) => (
            <option
              key={village.id}
              value={village.id}
            >
              {village.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <section className="market-form-panel">
          <h2>
            {editingMarket
              ? "Edit Market"
              : "Add Market"}
          </h2>

          <MarketForm
            key={editingMarket?.id ?? "new"}
            villages={villages}
            products={products}
            market={editingMarket}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </section>
      )}

      <section className="market-table-panel">
        <div className="market-table-header">
          <h2>Markets</h2>

          <span>
            {filteredMarkets.length} entries
          </span>
        </div>

        <div className="market-table-wrapper">
          <table className="market-table">
            <thead>
              <tr>
                <th>Village</th>
                <th>Product</th>
                <th>Side</th>
                <th>Unit Price</th>
                <th>Initial Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMarkets.map((market) => {
                const village =
                  villageMap.get(
                    market.villageId,
                  );

                const product =
                  productMap.get(
                    market.productId,
                  );

                return (
                  <tr key={market.id}>
                    <td data-label="Village">
                      {village?.name ??
                        market.villageId}
                    </td>

                    <td data-label="Product">
                      <div className="market-product-cell">
                        {product?.image?.path && (
                          <img
                            src={`/${product.image.path.replaceAll("\\", "/")}?v=${encodeURIComponent(
                              product.id,
                            )}`}
                            alt=""
                          />
                        )}

                        <span>
                          {product?.name ??
                            market.productId}
                        </span>
                      </div>
                    </td>

                    <td data-label="Side">
                      <span
                        className={`market-side market-side-${market.side}`}
                      >
                        {market.side ===
                        "supply"
                          ? "SUPPLY"
                          : "DEMAND"}
                      </span>
                    </td>

                    <td data-label="Unit price">
                      {currency ? formatMoney(market.unitPrice, currency) : market.unitPrice.toLocaleString()}
                    </td>

                    <td data-label="Initial quantity">
                      {market.initialQuantity}
                    </td>

                    <td data-label="Actions">
                      <div className="market-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(market)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              market,
                            )
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredMarkets.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="market-empty"
                  >
                    No markets found. Add Supply or Demand to connect a product with a village.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
