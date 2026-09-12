import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import type { MouseEvent } from "react";
import { resolveRouteEdgeGeometry } from "./route-edge-layout";

export interface DirectionalRouteEdgeData extends Record<string, unknown> {
  routeId: string;
  from: string;
  to: string;
  durationLabel: string;
  onEdit: (routeId: string) => void;
}

export type DirectionalRouteEdgeType = Edge<DirectionalRouteEdgeData, "directionalRoute">;

export function DirectionalRouteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  markerStart,
  selected,
  data,
}: EdgeProps<DirectionalRouteEdgeType>) {
  const geometry = resolveRouteEdgeGeometry({
    source: { x: sourceX, y: sourceY },
    target: { x: targetX, y: targetY },
  });
  const routeId = data?.routeId ?? id;
  const editRoute = (event: MouseEvent) => {
    event.stopPropagation();
    data?.onEdit(routeId);
  };

  return (
    <g
      className={`directional-route-edge${selected ? " selected" : ""}`}
      data-testid={`route-edge-${routeId}`}
      data-route-id={routeId}
      data-route-from={data?.from}
      data-route-to={data?.to}
      onDoubleClick={editRoute}
    >
      <BaseEdge
        id={id}
        path={geometry.path}
        markerEnd={markerEnd}
        markerStart={markerStart}
        interactionWidth={14}
        className="directional-route-path"
        onDoubleClick={editRoute}
      />
      <EdgeLabelRenderer>
        <div
          className={`directional-route-label nodrag nopan${selected ? " selected" : ""}`}
          data-testid={`route-label-${routeId}`}
          data-route-id={routeId}
          style={{
            transform: `translate(-50%, -50%) translate(${geometry.labelX}px, ${geometry.labelY}px)`,
          }}
          onDoubleClick={editRoute}
        >
          {data?.durationLabel}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}
