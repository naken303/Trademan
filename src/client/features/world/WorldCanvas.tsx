import { useEffect } from "react";

import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  type Edge,
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
}

function createNodes(world: WorldData): VillageNodeType[] {
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
  }));
}

export function WorldCanvas({ world }: WorldCanvasProps) {
  const updateVillagePosition = useWorldStore(
    (state) => state.updateVillagePosition,
  );

  const [nodes, setNodes, onNodesChange] =
    useNodesState<VillageNodeType>(createNodes(world));

  useEffect(() => {
    setNodes(createNodes(world));
  }, [world, setNodes]);

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
    <div
      style={{
        width: "100%",
        height: "600px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        marginTop: "20px",
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