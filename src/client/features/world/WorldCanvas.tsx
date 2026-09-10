import { useEffect } from "react";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Edge,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorldData } from "../../../shared/types";
import {
  VillageNode,
  type VillageNodeType,
} from "./VillageNode";
import { useWorldStore } from "./world-store";

interface WorldCanvasProps {
  world: WorldData;
  productDropActive: boolean;
  onProductDrop: (productId: string, villageId: string) => void;
  onRouteConnect: (from: string, to: string) => void;
  onRouteEdit: (routeId: string) => void;
}

function createNodes(world: WorldData, productDropActive: boolean, onProductDrop: WorldCanvasProps["onProductDrop"]): VillageNodeType[] {
  return world.villages.map((village) => {
    const villageMarkets = world.markets.filter(
      (market) => market.villageId === village.id,
    );

    return {
      id: village.id,
      position: {
        x: village.position.x,
        y: village.position.y,
      },
      data: {
        village,
        markets: villageMarkets,
        products: world.products,
        productDropActive,
        onProductDrop,
      },
      type: "village",
    };
  });
}

function createEdges(world: WorldData): Edge[] {
  return world.routes.map((route) => ({
    id: route.id,
    source: route.from,
    target: route.to,
    label: `${route.travelTime.days}d ${route.travelTime.hours}h`,
    type: "default",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

export function WorldCanvas({ world, productDropActive, onProductDrop, onRouteConnect, onRouteEdit }: WorldCanvasProps) {
  const updateVillagePosition = useWorldStore(
    (state) => state.updateVillagePosition,
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<VillageNodeType>(createNodes(world, productDropActive, onProductDrop));

  useEffect(() => {
    setNodes(createNodes(world, productDropActive, onProductDrop));
  }, [world, productDropActive, onProductDrop, setNodes]);

  const edges = createEdges(world);

  const handleNodeDragStop = (
    _event: unknown,
    node: VillageNodeType,
  ) => {
    updateVillagePosition(
      node.id,
      node.position.x,
      node.position.y,
    );
  };

  return (
    <div className="world-canvas"
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        marginTop: "20px",
        overflow: "hidden",
        background: "var(--color-surface-1)",
      }}
    >
      <ReactFlow<VillageNodeType, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          village: VillageNode,
        }}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={(connection: Connection) => { if (connection.source && connection.target && connection.source !== connection.target) onRouteConnect(connection.source, connection.target); }}
        isValidConnection={(connection) => Boolean(connection.source && connection.target && connection.source !== connection.target)}
        onEdgeDoubleClick={(_event, edge) => onRouteEdit(edge.id)}
        edgesFocusable
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        nodesDraggable
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
