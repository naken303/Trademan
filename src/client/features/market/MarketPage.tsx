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

  const filteredMarkets =
    selectedVillageId === "all"
      ? markets
      : markets.filter(
          (market) =>
            market.villageId ===
            selectedVillageId,
        );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const world = await getWorld();

      setVillages(world.villages);
      setProducts(world.products);
      setMarkets(world.markets);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "ไม่สามารถโหลดข้อมูล Market ได้",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (
      selectedVillageId !== "all" &&
      !villages.some(
        (village) =>
          village.id === selectedVillageId,
      )
    ) {
      setSelectedVillageId("all");
    }
  }, [selectedVillageId, villages]);

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
      `ต้องการลบ Market ${product?.name ?? market.productId} ที่ ${village?.name ?? market.villageId} หรือไม่?`,
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
          : "ไม่สามารถลบ Market ได้",
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
          กำลังโหลดข้อมูล Market...
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
            จัดการ Supply และ Demand
            ของแต่ละหมู่บ้าน
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
          + เพิ่ม Market
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
            ทุกหมู่บ้าน
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
              ? "แก้ไข Market"
              : "เพิ่ม Market"}
          </h2>

          <MarketForm
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
            {filteredMarkets.length} รายการ
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
                    <td>
                      {village?.name ??
                        market.villageId}
                    </td>

                    <td>
                      <div className="market-product-cell">
                        {product?.image?.path && (
                          <img
                            src={`/assets/${product.image.path.replaceAll("\\", "/")}?v=${encodeURIComponent(
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

                    <td>
                      <span
                        className={`market-side market-side-${market.side}`}
                      >
                        {market.side ===
                        "supply"
                          ? "SUPPLY"
                          : "DEMAND"}
                      </span>
                    </td>

                    <td>
                      {market.unitPrice}
                    </td>

                    <td>
                      {market.initialQuantity}
                    </td>

                    <td>
                      <div className="market-actions">
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(market)
                          }
                        >
                          แก้ไข
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              market,
                            )
                          }
                        >
                          ลบ
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
                    ยังไม่มี Market
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