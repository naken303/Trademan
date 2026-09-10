import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { Market, Product, Village } from "../../../shared/types";

export type VillageNodeData = Record<string, unknown> & {
  village: Village;
  markets: Market[];
  products: Product[];
  productDropActive: boolean;
  onProductDrop: (productId: string, villageId: string) => void;
};

export type VillageNodeType = Node<VillageNodeData, "village">;

function formatDuration(days: number, hours: number): string {
  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }

  if (hours > 0 || parts.length === 0) {
    parts.push(`${hours}h`);
  }

  return parts.join(" ");
}

function formatMarketEntry(
  market: Market,
  products: Product[],
): string {
  const product = products.find(
    (item) => item.id === market.productId,
  );

  const productName = product?.name ?? market.productId;

  return `${productName} ${market.initialQuantity} @ ${market.unitPrice}`;
}

export function VillageNode({
  data,
}: NodeProps<VillageNodeType>) {
  const { village, markets, products } = data;

  const supplyMarkets = markets.filter(
    (market) => market.side === "supply",
  );

  const demandMarkets = markets.filter(
    (market) => market.side === "demand",
  );

  const resetText = formatDuration(
    village.reset.current.days,
    village.reset.current.hours,
  );

  return (
    <div className={`village-node${data.productDropActive ? " product-drop-active" : ""}`} data-testid={`village-node-${village.id}`}
      onDragOver={(event) => { if (data.productDropActive) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }}
      onDrop={(event) => { event.preventDefault(); try { const payload = JSON.parse(event.dataTransfer.getData("application/x-village-trade-product")) as unknown; if (typeof payload === "object" && payload !== null && "type" in payload && "productId" in payload && payload.type === "product" && typeof payload.productId === "string") data.onProductDrop(payload.productId, village.id); } catch { /* Ignore malformed drag payloads. */ } }}
      style={{
        minWidth: "220px",
        padding: "12px",
        border: "2px solid var(--color-primary)",
        borderRadius: "10px",
        background: "var(--color-surface-2)",
        color: "var(--color-text)",
        boxShadow: "var(--shadow-panel)",
      }}
    >
      <Handle type="target" position={Position.Left} data-testid={`route-target-${village.id}`} title={`Connect route to ${village.name}`} />
      <Handle type="source" position={Position.Right} data-testid={`route-source-${village.id}`} title={`Start route from ${village.name}`} />

      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          marginBottom: "8px",
        }}
      >
        🏘️ {village.name}
      </div>

      <div
        style={{
          fontSize: "13px",
          marginBottom: "4px",
        }}
      >
        💰 {village.initialReserveMoney.toLocaleString()} THB
      </div>

      <div
        style={{
          fontSize: "13px",
          marginBottom: "10px",
        }}
      >
        🔄 Reset: {resetText}
      </div>

      {supplyMarkets.length > 0 && (
        <div style={{ marginBottom: "8px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "4px",
            }}
          >
            SUPPLY
          </div>

          {supplyMarkets.map((market) => (
            <div
              key={market.id}
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              🟢 {formatMarketEntry(market, products)}
            </div>
          ))}
        </div>
      )}

      {demandMarkets.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "4px",
            }}
          >
            DEMAND
          </div>

          {demandMarkets.map((market) => (
            <div
              key={market.id}
              style={{
                fontSize: "12px",
                lineHeight: 1.5,
              }}
            >
              🔵 {formatMarketEntry(market, products)}
            </div>
          ))}
        </div>
      )}
      <div className="village-market-counts"><span>Supply {supplyMarkets.length}</span><span>Demand {demandMarkets.length}</span></div>
    </div>
  );
}
