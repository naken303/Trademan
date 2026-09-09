import { useEffect, useRef, useState } from "react";
import { worldDataSchema } from "../../../shared/schemas";
import { ZodError } from "zod";
import type { InitialInventoryItem, WorldData } from "../../../shared/types";
import {
  createWorldBackup,
  downloadWorldExport,
  getWorld,
  importWorldData,
  saveWorldData,
} from "./world-api";
import "./DatabaseSettingsPage.css";

type Feedback = { kind: "success" | "error"; message: string } | null;
const messageFor = (error: unknown) => {
  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return issue ? `${issue.path.join(".") || "World data"}: ${issue.message}` : "World data is invalid";
  }
  return error instanceof Error ? error.message : "Operation failed";
};

export function DatabaseSettingsPage() {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getWorld().then(setWorld).catch((error) => setFeedback({ kind: "error", message: messageFor(error) }));
  }, []);

  const run = async (action: () => Promise<string>) => {
    setBusy(true); setFeedback(null);
    try { setFeedback({ kind: "success", message: await action() }); }
    catch (error) { setFeedback({ kind: "error", message: messageFor(error) }); }
    finally { setBusy(false); }
  };

  const save = () => run(async () => {
    if (!world) throw new Error("World settings are unavailable");
    const saved = await saveWorldData(worldDataSchema.parse(world));
    setWorld(saved);
    return "Settings saved.";
  });

  const exportJson = () => run(async () => {
    const blob = await downloadWorldExport();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "village-trade-world.json"; link.click();
    URL.revokeObjectURL(url);
    return "World JSON exported.";
  });

  const importJson = async (file: File) => {
    try {
      const parsed = worldDataSchema.parse(JSON.parse(await file.text()));
      if (!window.confirm("Importing will replace the current saved world configuration. Continue?")) return;
      await run(async () => {
        const imported = await importWorldData(parsed);
        setWorld(imported);
        return "World imported successfully.";
      });
    } catch (error) {
      setFeedback({ kind: "error", message: messageFor(error) });
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const updatePlayer = (changes: Partial<WorldData["player"]>) => {
    setWorld((current) => current ? { ...current, player: { ...current.player, ...changes } } : current);
  };
  const updateInventory = (index: number, changes: Partial<InitialInventoryItem>) => {
    if (!world) return;
    const initialInventory = world.player.initialInventory.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item);
    updatePlayer({ initialInventory });
  };

  if (!world) return <section className="settings-page"><h2>Database & Settings</h2>
    <p className={feedback?.kind === "error" ? "settings-feedback error" : undefined}>{feedback?.message ?? "Loading settings..."}</p>
    {feedback?.kind === "error" && <button type="button" disabled={busy} onClick={() => void run(async () => {
      const loaded = await getWorld(); setWorld(loaded); return "Settings loaded.";
    })}>Try again</button>}
  </section>;

  return (
    <section className="settings-page">
      <header><div><h2>Database & Settings</h2><p>Manage the persisted world definition. Simulation runtime progress is not included.</p></div>
        <button type="button" disabled={busy} onClick={() => void save()}>Save settings</button></header>
      {feedback && <p className={`settings-feedback ${feedback.kind}`} role="status">{feedback.message}</p>}

      <section className="settings-card"><h3>World data</h3><div className="settings-actions">
        <button type="button" className="secondary" disabled={busy} onClick={() => void exportJson()}>Export JSON</button>
        <label className={`settings-file-button${busy ? " disabled" : ""}`}>Import JSON
          <input ref={fileInput} type="file" accept="application/json,.json" disabled={busy}
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file); }} />
        </label>
        <button type="button" className="secondary" disabled={busy} onClick={() => void run(async () => `Backup created: ${await createWorldBackup()}`)}>Create Backup</button>
      </div></section>

      <section className="settings-card"><h3>World & Player</h3><div className="settings-fields">
        <label>Currency<input value={world.settings.currency} onChange={(event) => setWorld({ ...world, settings: { currency: event.target.value } })} /></label>
        <label>Current village<select value={world.player.currentVillageId} onChange={(event) => updatePlayer({ currentVillageId: event.target.value })}>
          {world.villages.map((village) => <option key={village.id} value={village.id}>{village.name}</option>)}</select></label>
        <label>Starting money<input type="number" min="0" value={world.player.money} onChange={(event) => updatePlayer({ money: Number(event.target.value) })} /></label>
        <label>Inventory capacity (crates)<input type="number" min="1" step="1" value={world.player.inventoryCapacityCrates} onChange={(event) => updatePlayer({ inventoryCapacityCrates: Number(event.target.value) })} /></label>
        <label className="settings-checkbox"><input type="checkbox" checked={world.player.continuousMode} onChange={(event) => updatePlayer({ continuousMode: event.target.checked })} /> Continuous mode</label>
      </div></section>

      <section className="settings-card"><div className="settings-section-heading"><h3>Initial inventory</h3>
        <button type="button" className="secondary" disabled={world.products.length === 0} onClick={() => {
          const product = world.products.find((candidate) => !world.player.initialInventory.some((item) => item.productId === candidate.id));
          if (product) updatePlayer({ initialInventory: [...world.player.initialInventory, { productId: product.id, quantity: 1, unitCost: 0 }] });
          else setFeedback({ kind: "error", message: "Every product is already in initial inventory." });
        }}>Add product</button></div>
        {world.player.initialInventory.length === 0 ? <p>No starting inventory.</p> : <div className="settings-inventory">
          {world.player.initialInventory.map((item, index) => <div key={`${item.productId}-${index}`}>
            <label>Product<select value={item.productId} onChange={(event) => updateInventory(index, { productId: event.target.value })}>
              {world.products.filter((product) => product.id === item.productId || !world.player.initialInventory.some((entry) => entry.productId === product.id))
                .map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
            <label>Quantity<input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateInventory(index, { quantity: Number(event.target.value) })} /></label>
            <label>Unit cost<input type="number" min="0" step="any" value={item.unitCost} onChange={(event) => updateInventory(index, { unitCost: Number(event.target.value) })} /></label>
            <button type="button" className="danger" onClick={() => updatePlayer({ initialInventory: world.player.initialInventory.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
          </div>)}</div>}
      </section>

      <section className="settings-card"><h3>Simulation & Optimization</h3><div className="settings-fields">
        <label>Start day<input type="number" min="1" step="1" value={world.simulation.startDay} onChange={(event) => setWorld({ ...world, simulation: { ...world.simulation, startDay: Number(event.target.value) } })} /></label>
        <label>Start hour<input type="number" min="0" max="23" step="1" value={world.simulation.startHour} onChange={(event) => setWorld({ ...world, simulation: { ...world.simulation, startHour: Number(event.target.value) } })} /></label>
        <label>Period (days)<input type="number" min="1" step="1" value={world.optimization.periodDays} onChange={(event) => setWorld({ ...world, optimization: { ...world.optimization, periodDays: Number(event.target.value) } })} /></label>
        <label>Beam width<input type="number" min="1" step="1" value={world.optimization.beamWidth} onChange={(event) => setWorld({ ...world, optimization: { ...world.optimization, beamWidth: Number(event.target.value) } })} /></label>
        <label>Maximum steps<input type="number" min="1" step="1" value={world.optimization.maxSteps} onChange={(event) => setWorld({ ...world, optimization: { ...world.optimization, maxSteps: Number(event.target.value) } })} /></label>
      </div></section>
    </section>
  );
}
