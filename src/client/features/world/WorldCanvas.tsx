import { useEffect, useState } from "react";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  useNodesState,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorldData } from "../../../shared/types";
import {
  DirectionalRouteEdge,
  type DirectionalRouteEdgeType,
} from "./DirectionalRouteEdge";
import {
  formatRouteDuration,
  resolveRoutePairLayouts,
  selectRouteHandleSides,
} from "./route-edge-layout";
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

const edgeTypes = {
  directionalRoute: DirectionalRouteEdge,
};

function createEdges(world: WorldData, nodes: VillageNodeType[], onRouteEdit: WorldCanvasProps["onRouteEdit"], selectedEdgeId: string | null): DirectionalRouteEdgeType[] {
  const pairLayouts = resolveRoutePairLayouts(world.routes);
  const positions = new Map(nodes.map((node) => [node.id, node.position]));

  return world.routes.flatMap((route) => {
    const sourcePosition = positions.get(route.from);
    const targetPosition = positions.get(route.to);
    const pairLayout = pairLayouts.get(route.id);
    if (!sourcePosition || !targetPosition || !pairLayout) return [];
    const handles = selectRouteHandleSides(sourcePosition, targetPosition);

    return [{
    id: route.id,
    source: route.from,
    target: route.to,
    selected: route.id === selectedEdgeId,
    sourceHandle: `source-${handles.sourceSide}`,
    targetHandle: `target-${handles.targetSide}`,
    type: "directionalRoute",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    data: {
      routeId: route.id,
      from: route.from,
      to: route.to,
      durationLabel: formatRouteDuration(route.travelTime.days, route.travelTime.hours),
      onEdit: onRouteEdit,
      ...pairLayout,
    },
  }];
  });
}

export function WorldCanvas({ world, productDropActive, onProductDrop, onRouteConnect, onRouteEdit }: WorldCanvasProps) {
  const updateVillagePosition = useWorldStore(
    (state) => state.updateVillagePosition,
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<VillageNodeType>(createNodes(world, productDropActive, onProductDrop));
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  useEffect(() => {
    setNodes(createNodes(world, productDropActive, onProductDrop));
  }, [world, productDropActive, onProductDrop, setNodes]);

  const edges = createEdges(world, nodes, onRouteEdit, selectedEdgeId);

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
      <ReactFlow<VillageNodeType, DirectionalRouteEdgeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          village: VillageNode,
        }}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={(connection: Connection) => { if (connection.source && connection.target && connection.source !== connection.target) onRouteConnect(connection.source, connection.target); }}
        isValidConnection={(connection) => Boolean(connection.source && connection.target && connection.source !== connection.target)}
        onEdgeDoubleClick={(_event, edge) => onRouteEdit(edge.id)}
        onEdgeClick={(_event, edge) => setSelectedEdgeId(edge.id)}
        onPaneClick={() => setSelectedEdgeId(null)}
        edgesFocusable
        fitView
        fitViewOptions={{
          padding: 0.2,
        }}
        nodesDraggable
        connectionLineStyle={{ stroke: "var(--color-text-secondary)", strokeWidth: 2, strokeDasharray: "5 5" }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
