import { useEffect, useState } from "react";
import type { WorldData } from "../../../shared/types";
import {
  VillageResetSetup,
} from "../../components/VillageResetSetup";
import {
  createVillageResetDraft,
  parseVillageResetDraft,
  type VillageResetDraft,
} from "../../components/village-reset-setup-model";
import { getWorld } from "../world/world-api";
import type { SimulationMarket } from "./simulation-controller";
import { useSimulationStore } from "./simulation-store";
import "./SimulatorPage.css";

import { formatDuration } from "../../utils/format";
const productImage = (path: string) => `/${path.replaceAll("\\", "/")}`;

interface TradeRowProps {
  item: SimulationMarket; inventoryQuantity: number; playerMoney: number;
  villageMoney: number; currency: string;
  onTrade: (productId: string, quantity: number) => void;
}

function TradeRow(props: TradeRowProps) {
  const { item, inventoryQuantity, playerMoney, villageMoney, currency, onTrade } = props;
  const [quantityText, setQuantityText] = useState("1");
  const quantity = Number(quantityText);
  const validQuantity = Number.isInteger(quantity) && quantity > 0;
  const total = validQuantity ? quantity * item.market.unitPrice : 0;
  const unavailable = !validQuantity || quantity > item.quantity ||
    (item.market.side === "supply" ? total > playerMoney : quantity > inventoryQuantity || total > villageMoney);

  return (
    <article className="simulation-trade-row">
      <div className="simulation-product">
        {item.product.image ? <img src={productImage(item.product.image.path)} alt="" /> :
          <span className="simulation-product-placeholder" aria-hidden="true">{item.product.name[0]?.toUpperCase()}</span>}
        <div><strong>{item.product.name}</strong><small>{item.market.unitPrice.toLocaleString()} {currency} / unit</small></div>
      </div>
      <strong>{item.quantity.toLocaleString()} available</strong>
      <label>Quantity<input type="number" min="1" step="1" value={quantityText}
        onChange={(event) => setQuantityText(event.target.value)} /></label>
      <button type="button" disabled={unavailable} onClick={() => onTrade(item.product.id, quantity)}>
        {item.market.side === "supply" ? "Buy" : "Sell"}
      </button>
    </article>
  );
}

export function SimulatorPage() {
  const { snapshot, loading, error, initialize, travel, buy, sell, configureNewRun, clearError } = useSimulationStore();
  const [world, setWorld] = useState<WorldData | null>(null);
  const [resets, setResets] = useState<VillageResetDraft>({});
  const [worldLoading, setWorldLoading] = useState(true);
  const [worldError, setWorldError] = useState<string | null>(null);
  const [showResetErrors, setShowResetErrors] = useState(false);
  useEffect(() => { void getWorld().then((loaded) => {
    setWorld(loaded);
    setResets(createVillageResetDraft(loaded.villages));
    setWorldError(null);
  }).catch((cause: unknown) => {
    setWorldError(cause instanceof Error ? cause.message : "Unable to load simulation setup.");
  }).finally(() => setWorldLoading(false)); }, []);

  const start = () => {
    if (!world) return;
    const { initialization } = parseVillageResetDraft(world.villages, resets);
    setShowResetErrors(true);
    if (!initialization) return;
    void initialize(initialization);
  };

  if (!snapshot) return <section className="simulation-page simulation-setup-page">
    <header><h2>Simulation</h2><p>Configure the temporary village reset timers before starting the runtime simulation.</p></header>
    {worldLoading && <div className="page-state">Loading simulation setup...</div>}
    {!worldLoading && worldError && <div className="page-alert" role="alert">{worldError}</div>}
    {!worldLoading && world && world.villages.length === 0 && <div className="page-state">Create at least one Village before starting a simulation.</div>}
    {!worldLoading && world && world.villages.length > 0 && <>
      <VillageResetSetup villages={world.villages} values={resets} onChange={setResets} disabled={loading} showAllErrors={showResetErrors} />
      {error && <div className="simulation-error" role="alert">{error}</div>}
      <div className="simulation-start-action"><button type="button" disabled={loading} onClick={start}>{loading ? "Starting..." : "Start Simulation"}</button></div>
    </>}
  </section>;


  const inventoryByProduct = new Map(snapshot.state.player.inventory.map((item) => [item.productId, item.quantity]));
  const supplies = snapshot.markets.filter((item) => item.market.side === "supply");
  const demands = snapshot.markets.filter((item) => item.market.side === "demand");
  const tradeRow = (item: SimulationMarket, onTrade: TradeRowProps["onTrade"]) => (
    <TradeRow key={item.market.id} item={item}
      inventoryQuantity={inventoryByProduct.get(item.product.id) ?? 0}
      playerMoney={snapshot.state.player.money} villageMoney={snapshot.currentVillageMoney}
      currency={snapshot.currency} onTrade={onTrade} />
  );

  return (
    <section className="simulation-page">
      <header className="simulation-heading"><div><h2>Simulation</h2><p>Runtime changes stay inside this simulation session.</p></div>
        <button type="button" className="secondary" onClick={() => { setShowResetErrors(false); configureNewRun(); }}>Configure New Run</button></header>
      {error && <div className="simulation-error" role="alert"><span>{error}</span>
        <button type="button" onClick={clearError} aria-label="Dismiss error">×</button></div>}
      <div className="simulation-stats">
        <div><span>Time</span><strong>Day {snapshot.state.time.day}, {snapshot.state.time.hour}:00</strong></div>
        <div><span>Current village</span><strong>{snapshot.currentVillage.name}</strong></div>
        <div><span>Player money</span><strong>{snapshot.state.player.money.toLocaleString()} {snapshot.currency}</strong></div>
        <div><span>Crates</span><strong>{snapshot.usedInventoryCrates} / {snapshot.inventoryCapacityCrates}</strong></div>
        <div><span>Accumulated profit</span><strong>{snapshot.state.accumulatedProfit.toLocaleString()} {snapshot.currency}</strong></div>
      </div>
      <div className="simulation-grid">
        <div className="simulation-column">
          <section className="simulation-card"><h3>Travel</h3>
            {snapshot.destinations.length === 0 ? <p>No reachable destinations.</p> :
              <div className="simulation-destinations">{snapshot.destinations.map(({ village, travelTime }) =>
                <button key={village.id} type="button" onClick={() => travel(village.id)}>
                  <strong>{village.name}</strong><span>{formatDuration(travelTime.days, travelTime.hours)}</span></button>)}</div>}
          </section>
          <section className="simulation-card"><h3>Inventory</h3>
            {snapshot.state.player.inventory.length === 0 ? <p>Inventory is empty.</p> :
              <div className="simulation-inventory">{snapshot.state.player.inventory.map((item) => {
                const product = snapshot.products.find((candidate) => candidate.id === item.productId);
                return <div key={item.productId}>
                  <span className="simulation-inventory-product">
                    {product?.image && <img src={productImage(product.image.path)} alt="" />}
                    {product?.name ?? item.productId}
                  </span>
                  <strong>{item.quantity.toLocaleString()} units</strong>
                </div>;
              })}</div>}
          </section>
        </div>
        <div className="simulation-column">
          <section className="simulation-card simulation-village-card">
            <div><h3>{snapshot.currentVillage.name}</h3><p>Village reserve: <strong>{snapshot.currentVillageMoney.toLocaleString()} {snapshot.currency}</strong></p></div>
            <div><span>Next reset in</span><strong>{formatDuration(snapshot.currentVillageReset.days, snapshot.currentVillageReset.hours)}</strong></div>
          </section>
          <section className="simulation-card"><h3 className="supply-heading">Supply · Buy</h3>
            {supplies.length === 0 ? <p>No products for sale here.</p> : supplies.map((item) => tradeRow(item, buy))}</section>
          <section className="simulation-card"><h3 className="demand-heading">Demand · Sell</h3>
            {demands.length === 0 ? <p>No products wanted here.</p> : demands.map((item) => tradeRow(item, sell))}</section>
        </div>
      </div>
    </section>
  );
}
