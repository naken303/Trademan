import { z } from "zod";

import type { Route } from "../../../shared/types";
import { routeSchema } from "../../../shared/schemas";

const API_BASE = "/api/routes";

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return schema.parse(data);
}

export async function getRoutes(): Promise<Route[]> {
  return parseResponse(await fetch(API_BASE), z.array(routeSchema));
}

export async function createRoute(route: Omit<Route, "id">): Promise<Route> {
  return parseResponse(
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route),
    }),
    routeSchema,
  );
}

export async function updateRoute(
  routeId: string,
  route: Omit<Route, "id">,
): Promise<Route> {
  return parseResponse(
    await fetch(`${API_BASE}/${encodeURIComponent(routeId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(route),
    }),
    routeSchema,
  );
}

export async function deleteRoute(routeId: string): Promise<void> {
  await parseResponse(
    await fetch(`${API_BASE}/${encodeURIComponent(routeId)}`, {
      method: "DELETE",
    }),
    z.object({ success: z.literal(true) }),
  );
}
