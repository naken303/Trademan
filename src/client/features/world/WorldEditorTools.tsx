import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { marketSchema, routeInputSchema } from "../../../shared/schemas";
import type { Market, Product, Route, WorldData } from "../../../shared/types";
import {
  getMarketAssignmentDraft,
  normalizeProductPaletteMode,
  type MarketAssignmentDraft,
  type ProductPaletteMode,
} from "./world-editor-model";

export const PRODUCT_DRAG_TYPE = "application/x-village-trade-product";
const PRODUCT_PALETTE_MODE_KEY = "village-trade-product-palette-mode";
const imageUrl = (product: Product) => product.image ? `/${product.image.path.replaceAll("\\", "/")}` : null;

export function ProductPalette({ products, onDragState }: { products: Product[]; onDragState: (active: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ProductPaletteMode>(() =>
    normalizeProductPaletteMode(typeof window === "undefined" ? null : window.localStorage.getItem(PRODUCT_PALETTE_MODE_KEY)),
  );
  const filtered = products.filter((product) => `${product.name} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const changeMode = (next: ProductPaletteMode) => {
    setMode(next);
    window.localStorage.setItem(PRODUCT_PALETTE_MODE_KEY, next);
  };
  const beginDrag = (event: DragEvent, productId: string) => {
    event.dataTransfer.setData(PRODUCT_DRAG_TYPE, JSON.stringify({ type: "product", productId }));
    event.dataTransfer.effectAllowed = "copy"; onDragState(true);
  };
  return <aside className={`product-palette palette-${mode}`} aria-label="Product palette"><div className="palette-heading"><div><h2>Product Palette</h2><p>Drag a product onto a village.</p></div><div className="palette-modes" aria-label="Palette display mode">
    <button type="button" className={mode === "images" ? "active" : ""} aria-label="Show product images" aria-pressed={mode === "images"} onClick={() => changeMode("images")}>Images</button>
    <button type="button" className={mode === "details" ? "active" : ""} aria-label="Show product details" aria-pressed={mode === "details"} onClick={() => changeMode("details")}>Details</button>
  </div></div>
    <label>Search products<input type="search" placeholder="Name or product ID" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="product-palette-list">{filtered.map((product) => { const image = imageUrl(product); return <article key={product.id} draggable tabIndex={0} title={product.name} aria-label={`${product.name} (${product.id})`} data-testid={`palette-product-${product.id}`} onDragStart={(event) => beginDrag(event, product.id)} onDragEnd={() => onDragState(false)}>
      {image ? <img src={image} alt="" draggable={false} /> : <span className="product-fallback" aria-hidden="true">{mode === "images" ? product.name.slice(0, 2).toUpperCase() : product.name[0]?.toUpperCase()}</span>}
      {mode === "details" && <div className="palette-product-details"><strong>{product.name}</strong><small>{product.id}</small><small>S: {product.baseSupplyPrice ?? "—"} · D: {product.baseDemandPrice ?? "—"}</small></div>}
    </article>; })}
      {filtered.length === 0 && <p className="palette-empty">No products match your search.</p>}</div>
  </aside>;
}

function Modal({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="world-dialog" onCancel={(event) => { event.preventDefault(); onCancel(); }} aria-labelledby="world-dialog-title">
    <div className="world-dialog-heading"><h2 id="world-dialog-title">{title}</h2><button type="button" className="dialog-close" onClick={onCancel} aria-label="Close dialog">×</button></div>{children}
  </dialog>;
}

export function RouteDialog({ world, from, to, existing, onCancel, onSave }: { world: WorldData; from: string; to: string; existing?: Route; onCancel: () => void; onSave: (input: Omit<Route, "id">, existing?: Route) => Promise<void> }) {
  const [days, setDays] = useState(String(existing?.travelTime.days ?? 0)); const [hours, setHours] = useState(String(existing?.travelTime.hours ?? 1));
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const village = (id: string) => world.villages.find((item) => item.id === id)?.name ?? id;
  async function submit(event: FormEvent) { event.preventDefault(); const parsed = routeInputSchema.safeParse({ from, to, travelTime: { days: Number(days), hours: Number(hours) } });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid route"); return; }
    setSaving(true); setError(""); try { await onSave(parsed.data, existing); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save route"); } finally { setSaving(false); }
  }
  return <Modal title={existing ? "Edit Route" : "Create Route"} onCancel={onCancel}><p className="dialog-context"><strong>{village(from)}</strong><span>→</span><strong>{village(to)}</strong></p>
    <form onSubmit={submit}><div className="dialog-fields"><label>Days<input aria-label="Route days" type="number" min="0" step="1" value={days} onChange={(event) => setDays(event.target.value)} /></label><label>Hours<input aria-label="Route hours" type="number" min="0" max="23" step="1" value={hours} onChange={(event) => setHours(event.target.value)} /></label></div>
      {error && <div className="dialog-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : existing ? "Save Changes" : "Create Route"}</button></div></form></Modal>;
}

export function MarketAssignmentDialog({ world, villageId, productId, onCancel, onSave }: { world: WorldData; villageId: string; productId: string; onCancel: () => void; onSave: (input: Omit<Market, "id">, existing?: Market) => Promise<void> }) {
  const find = (side: Market["side"]) => world.markets.find((market) => market.villageId === villageId && market.productId === productId && market.side === side);
  const product = world.products.find((item) => item.id === productId); const village = world.villages.find((item) => item.id === villageId);
  const [side, setSide] = useState<Market["side"]>("supply");
  const [drafts, setDrafts] = useState<Record<Market["side"], MarketAssignmentDraft>>(() => ({
    supply: getMarketAssignmentDraft(world, villageId, productId, "supply"),
    demand: getMarketAssignmentDraft(world, villageId, productId, "demand"),
  }));
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false); const existing = find(side); const draft = drafts[side];
  if (!product || !village) return <Modal title="Market unavailable" onCancel={onCancel}><div className="dialog-error">The selected product or village no longer exists.</div><div className="dialog-actions"><button type="button" onClick={onCancel}>Close</button></div></Modal>;
  function changeSide(next: Market["side"]) { setSide(next); setError(""); }
  function updateDraft(field: "price" | "quantity", value: string) { setDrafts((current) => ({ ...current, [side]: { ...current[side], [field]: value } })); }
  async function submit(event: FormEvent) { event.preventDefault(); const candidate = { id: existing?.id ?? "new", villageId, productId, side, unitPrice: Number(draft.price), initialQuantity: Number(draft.quantity) }; const parsed = marketSchema.safeParse(candidate);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Invalid market entry"); return; }
    setSaving(true); setError(""); try { const { id: _id, ...input } = parsed.data; void _id; await onSave(input, existing); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save market"); } finally { setSaving(false); }
  }
  const image = imageUrl(product); return <Modal title={existing ? `Edit ${product.name} ${side === "supply" ? "Supply" : "Demand"}` : "Add Product to Village"} onCancel={onCancel}>
    <div className="dialog-product">{image ? <img src={image} alt="" /> : <span className="product-fallback">{product.name[0]?.toUpperCase()}</span>}<div><strong>{product.name}</strong><small>{village.name}</small></div></div>
    <form onSubmit={submit}><fieldset><legend>Market type</legend><label><input type="radio" name="market-side" checked={side === "supply"} onChange={() => changeSide("supply")} /> Supply</label><label><input type="radio" name="market-side" checked={side === "demand"} onChange={() => changeSide("demand")} /> Demand</label></fieldset>
      <div className="dialog-fields"><label>Unit price<input aria-label="Unit price" type="number" min="0.01" step="any" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} /></label><label>Quantity (units)<input aria-label="Quantity (units)" type="number" min="1" step="1" value={draft.quantity} onChange={(event) => updateDraft("quantity", event.target.value)} /></label></div>
      {existing && <p className="dialog-note">This {side} entry already exists. Saving will update it instead of creating a duplicate.</p>}{error && <div className="dialog-error" role="alert">{error}</div>}
      <div className="dialog-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : existing ? "Save Changes" : "Add"}</button></div></form></Modal>;
}
