import { useCallback, useEffect, useState } from "react";
import type { Market, Route } from "../../../shared/types";
import { createMarket, updateMarket } from "../market/market-api";
import { createRoute, updateRoute } from "../routes/route-api";
import { WorldCanvas } from "./WorldCanvas";
import { MarketAssignmentDialog, ProductPalette, RouteDialog } from "./WorldEditorTools";
import { useWorldStore } from "./world-store";
import "./WorldPage.css";

type RouteDraft = { from: string; to: string; existing?: Route };
type MarketDraft = { villageId: string; productId: string };

export function WorldPage() {
  const world = useWorldStore((state) => state.world); const loading = useWorldStore((state) => state.loading); const error = useWorldStore((state) => state.error);
  const hasUnsavedChanges = useWorldStore((state) => state.hasUnsavedChanges); const canUndo = useWorldStore((state) => state.undoStack.length > 0); const canRedo = useWorldStore((state) => state.redoStack.length > 0);
  const loadWorld = useWorldStore((state) => state.loadWorld); const undo = useWorldStore((state) => state.undo); const redo = useWorldStore((state) => state.redo);
  const saveChanges = useWorldStore((state) => state.saveChanges); const cancelChanges = useWorldStore((state) => state.cancelChanges);
  const [routeDraft, setRouteDraft] = useState<RouteDraft | null>(null); const [marketDraft, setMarketDraft] = useState<MarketDraft | null>(null); const [productDragActive, setProductDragActive] = useState(false);
  useEffect(() => { void loadWorld(); }, [loadWorld]);

  const connectRoute = useCallback((from: string, to: string) => {
    const current = useWorldStore.getState().world; if (!current || from === to) return;
    const existing = current.routes.find((route) =>
      (route.from === from && route.to === to) || (route.from === to && route.to === from));
    setRouteDraft({ from: existing?.from ?? from, to: existing?.to ?? to, existing });
  }, []);
  const editRoute = useCallback((routeId: string) => { const current = useWorldStore.getState().world; const existing = current?.routes.find((route) => route.id === routeId); if (existing) setRouteDraft({ from: existing.from, to: existing.to, existing }); }, []);
  const dropProduct = useCallback((productId: string, villageId: string) => { const current = useWorldStore.getState().world; setProductDragActive(false); if (current?.products.some((product) => product.id === productId) && current.villages.some((village) => village.id === villageId)) setMarketDraft({ productId, villageId }); }, []);

  if (loading && !world) return <div className="page-state">Loading world...</div>;
  if (error && !world) return <div className="page-alert">Failed to load world: {error}<div><button type="button" onClick={() => void loadWorld()}>Try again</button></div></div>;
  if (!world) return <div className="page-state">No world data is configured.</div>;

  async function saveRoute(input: Omit<Route, "id">, existing?: Route) {
    if (existing) await updateRoute(existing.id, input); else await createRoute(input); setRouteDraft(null); await loadWorld();
  }
  async function saveMarket(input: Omit<Market, "id">, existing?: Market) {
    if (existing) await updateMarket(existing.id, input); else await createMarket(input); setMarketDraft(null); await loadWorld();
  }

  return <section className="world-page">
    <header className="world-heading"><div><h1>World</h1><p>Arrange villages, connect directional routes, and assign market products visually.</p></div>
      <div className="world-summary"><span>{world.villages.length} Villages</span><span>{world.products.length} Products</span><span>{world.routes.length} Routes</span><span>{world.markets.length} Markets</span><span>{world.settings.currency}</span></div></header>
    <div className="world-toolbar"><div><button type="button" onClick={undo} disabled={!canUndo || loading}>Undo</button><button type="button" onClick={redo} disabled={!canRedo || loading}>Redo</button></div>
      <div><button type="button" className="secondary" onClick={cancelChanges} disabled={!hasUnsavedChanges || loading}>Cancel position changes</button><button onClick={() => void saveChanges()} disabled={!hasUnsavedChanges || loading}>{loading ? "Saving..." : "Save positions"}</button>{hasUnsavedChanges && <span className="unsaved-badge">Unsaved positions</span>}</div></div>
    {error && <div className="page-alert" role="alert">World update failed: {error}</div>}
    <div className="world-editor"><ProductPalette products={world.products} onDragState={setProductDragActive} /><div className={productDragActive ? "canvas-shell dragging-product" : "canvas-shell"}><div className="canvas-hint"><strong>Directional routes</strong><span>Drag from a village edge to another village. Double-click a route to edit.</span></div><WorldCanvas world={world} productDropActive={productDragActive} onProductDrop={dropProduct} onRouteConnect={connectRoute} onRouteEdit={editRoute} /></div></div>
    {routeDraft && <RouteDialog world={world} {...routeDraft} onCancel={() => setRouteDraft(null)} onSave={saveRoute} />}
    {marketDraft && <MarketAssignmentDialog world={world} {...marketDraft} onCancel={() => setMarketDraft(null)} onSave={saveMarket} />}
  </section>;
}
