import { randomUUID } from "node:crypto";
import { Router } from "express";

import { routeInputSchema } from "../../shared/schemas/route.schema";
import {
  createRoute,
  deleteRoute,
  getAllRoutes,
  getRouteById,
  getRouteByEndpoints,
  updateRoute,
} from "../database/repositories/route-repository";
import { getVillageById } from "../database/repositories/village-repository";

const routesRouter = Router();
function routeId(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validateVillages(from: string, to: string): string | null {
  if (!getVillageById(from)) return `Village not found: ${from}`;
  if (!getVillageById(to)) return `Village not found: ${to}`;
  return null;
}

routesRouter.get("/", (_req, res) => {
  res.json(getAllRoutes());
});

routesRouter.get("/:id", (req, res) => {
  const id = routeId(req.params.id);
  const route = id ? getRouteById(id) : null;
  if (!route) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  res.json(route);
});

routesRouter.post("/", (req, res) => {
  const parsed = routeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const villageError = validateVillages(parsed.data.from, parsed.data.to);
  if (villageError) {
    res.status(400).json({ error: villageError });
    return;
  }
  if (getRouteByEndpoints(parsed.data.from, parsed.data.to)) {
    res.status(409).json({ error: "A route already exists for this village pair" });
    return;
  }
  const route = { id: randomUUID(), ...parsed.data };
  createRoute(route);
  res.status(201).json(route);
});

routesRouter.put("/:id", (req, res) => {
  const id = routeId(req.params.id);
  if (!id || !getRouteById(id)) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  const parsed = routeInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues });
    return;
  }
  const villageError = validateVillages(parsed.data.from, parsed.data.to);
  if (villageError) {
    res.status(400).json({ error: villageError });
    return;
  }
  const duplicate = getRouteByEndpoints(parsed.data.from, parsed.data.to);
  if (duplicate && duplicate.id !== id) {
    res.status(409).json({ error: "A route already exists for this village pair" });
    return;
  }
  const route = { id, ...parsed.data };
  updateRoute(route);
  res.json(route);
});

routesRouter.delete("/:id", (req, res) => {
  const id = routeId(req.params.id);
  if (!id || !getRouteById(id)) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  deleteRoute(id);
  res.json({ success: true });
});

export { routesRouter };
