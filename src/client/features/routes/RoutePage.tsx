import { useEffect, useMemo, useState } from "react";

import type { Route, Village } from "../../../shared/types";
import { getWorld } from "../world/world-api";
import { createRoute, deleteRoute, updateRoute } from "./route-api";
import { RouteForm } from "./RouteForm";
import "./RoutePage.css";
import { formatDuration } from "../../utils/format";

export function RoutePage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [editing, setEditing] = useState<Route | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const villageNames = useMemo(
    () => new Map(villages.map((village) => [village.id, village.name])),
    [villages],
  );

  async function loadData() {
    setLoading(true);
    try {
      const world = await getWorld();
      setRoutes(world.routes);
      setVillages(world.villages);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load routes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadData());
  }, []);

  async function handleSubmit(input: Omit<Route, "id">) {
    if (editing) await updateRoute(editing.id, input);
    else await createRoute(input);
    setEditing(null);
    setShowForm(false);
    await loadData();
  }

  async function handleDelete(route: Route) {
    if (!window.confirm(`Delete route ${villageNames.get(route.from) ?? route.from} ↔ ${villageNames.get(route.to) ?? route.to}?`)) return;
    try {
      await deleteRoute(route.id);
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete route");
    }
  }

  if (loading) return <section className="route-page"><div className="route-panel page-state">Loading routes...</div></section>;

  return <div className="route-page">
    <header><div><h1>Route Management</h1><p>Manage bidirectional routes with an optional different return time.</p></div>
      <button type="button" disabled={villages.length < 2} onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Route</button>
    </header>
    {error && <div className="route-error" role="alert">{error}</div>}
    {showForm && <section className="route-panel"><RouteForm key={editing?.id ?? "new"} villages={villages} route={editing} onSubmit={handleSubmit} onCancel={() => { setEditing(null); setShowForm(false); }} /></section>}
    <section className="route-panel"><table><thead><tr><th>From</th><th>To</th><th>Forward</th><th>Return</th><th>Actions</th></tr></thead>
      <tbody>{routes.map((route) => <tr key={route.id}><td data-label="From">{villageNames.get(route.from) ?? route.from}</td><td data-label="To">{villageNames.get(route.to) ?? route.to}</td><td data-label="Forward">{formatDuration(route.travelTime.days, route.travelTime.hours)}</td><td data-label="Return">{route.reverseTravelTime ? formatDuration(route.reverseTravelTime.days, route.reverseTravelTime.hours) : "Same as forward"}</td><td data-label="Actions" className="route-actions"><button type="button" onClick={() => { setEditing(route); setShowForm(true); }}>Edit</button><button type="button" onClick={() => void handleDelete(route)}>Delete</button></td></tr>)}
      {routes.length === 0 && <tr><td colSpan={5}>No routes yet. Add a route to connect two villages.</td></tr>}</tbody></table></section>
  </div>;
}
