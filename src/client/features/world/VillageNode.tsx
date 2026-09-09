import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { Market, Product, Village } from "../../../shared/types";

export type VillageNodeData = Record<string, unknown> & {
  village: Village;
  markets: Market[];
  products: Product[];
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
    <div
      style={{
        minWidth: "220px",
        padding: "12px",
        border: "2px solid #555",
        borderRadius: "10px",
        background: "#ffffff",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

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
    </div>
  );
}