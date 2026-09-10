import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getInventoryCrates } from "../../../domain/inventory";
import { getTravelTime } from "../../../domain/route";
import type { OptimizerPlanStep, OptimizerResult, OptimizerSearchOptions } from "../../../optimizer";
import type { WorldData } from "../../../shared/types";
import { getWorld } from "../world/world-api";
import { runOptimizer } from "./optimizer-api";
import "./OptimizerPage.css";

const limits = { periodDays: 365, beamWidth: 2_000, maxSteps: 500, maxExpandedStates: 500_000 } as const;
type FormValues = Record<keyof typeof limits, string>;
const timeLabel = (time: { day: number; hour: number }) => `Day ${time.day}, ${time.hour}:00`;
const durationLabel = (duration?: { days: number; hours: number }) => duration ? `${duration.days}d ${duration.hours}h` : "Unknown duration";

function initialForm(world: WorldData): FormValues {
  return {
    periodDays: String(world.optimization.periodDays), beamWidth: String(world.optimization.beamWidth),
    maxSteps: String(world.optimization.maxSteps),
    maxExpandedStates: String(Math.min(limits.maxExpandedStates, world.optimization.beamWidth * world.optimization.maxSteps * 4)),
  };
}

function validate(values: FormValues): OptimizerSearchOptions {
  const parsed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as Record<keyof FormValues, number>;
  for (const [key, maximum] of Object.entries(limits) as [keyof FormValues, number][]) {
    if (!Number.isInteger(parsed[key]) || parsed[key] < 1 || parsed[key] > maximum) {
      throw new Error(`${key} must be a whole number from 1 to ${maximum.toLocaleString()}.`);
    }
  }
  return parsed;
}

function StepRow({ step, previousVillageId, previousProfit, world, index }: {
  step: OptimizerPlanStep; previousVillageId: string; previousProfit: number; world: WorldData; index: number;
}) {
  const villageName = (id: string) => world.villages.find((item) => item.id === id)?.name ?? `Missing village (${id})`;
  const productName = (id: string) => world.products.find((item) => item.id === id)?.name ?? `Missing product (${id})`;
  const action = step.action;
  let title: string;
  let detail: string;
  if (action.type === "travel") {
    title = `Travel: ${villageName(previousVillageId)} → ${villageName(action.destinationId)}`;
    detail = `${durationLabel(getTravelTime(world.routes, previousVillageId, action.destinationId))} · arrived ${timeLabel(step.time)}`;
  } else {
    const market = world.markets.find((item) => item.villageId === step.villageId && item.productId === action.productId && item.side === (action.type === "buy" ? "supply" : "demand"));
    const total = market ? action.quantity * market.unitPrice : null;
    title = `${action.type === "buy" ? "Buy" : "Sell"}: ${action.quantity.toLocaleString()} ${productName(action.productId)}`;
    detail = `${villageName(step.villageId)}${market ? ` · ${market.unitPrice.toLocaleString()} ${world.settings.currency}/unit · ${action.type === "buy" ? "cost" : "revenue"} ${total!.toLocaleString()} ${world.settings.currency}` : " · price unavailable"}`;
    if (action.type === "sell") detail += ` · realized +${(step.accumulatedProfit - previousProfit).toLocaleString()} ${world.settings.currency}`;
  }
  return <li className={`optimizer-step ${action.type}`}><span>{index + 1}</span><div><strong><b className="optimizer-action-badge">{action.type}</b>{title}</strong><small>{detail}</small><small>Money: {step.playerMoney.toLocaleString()} {world.settings.currency} · {timeLabel(step.time)}</small></div></li>;
}

export function OptimizerPage() {
  const [world, setWorld] = useState<WorldData | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try { const loaded = await getWorld(); setWorld(loaded); setValues(initialForm(loaded)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load optimizer settings."); }
    finally { setLoading(false); }
  }
  useEffect(() => { getWorld().then((loaded) => { setWorld(loaded); setValues(initialForm(loaded)); setError(null); })
    .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load optimizer settings."))
    .finally(() => setLoading(false)); }, []);

  const usedCrates = useMemo(() => result && world ? getInventoryCrates(result.finalState.player.inventory, world.products) : 0, [result, world]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!values) return;
    try {
      const options = validate(values);
      setRunning(true); setError(null); setResult(null);
      setResult(await runOptimizer(options));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Optimizer failed."); }
    finally { setRunning(false); }
  }

  if (loading) return <section className="optimizer-page"><h2>Optimizer</h2><div className="page-state">Loading optimizer settings...</div></section>;
  if (!world || !values) return <section className="optimizer-page"><h2>Optimizer</h2><div className="page-alert" role="alert">{error ?? "Optimizer settings are unavailable."}</div><button className="optimizer-retry" type="button" onClick={() => { setLoading(true); void load(); }}>Try again</button></section>;
  const villageName = (id: string) => world.villages.find((item) => item.id === id)?.name ?? `Missing village (${id})`;
  const productName = (id: string) => world.products.find((item) => item.id === id)?.name ?? `Missing product (${id})`;
  const fields: [keyof FormValues, string][] = [["periodDays", "Optimization period (days)"], ["beamWidth", "Beam width"], ["maxSteps", "Maximum plan steps"], ["maxExpandedStates", "Maximum expanded states"]];
  return <section className="optimizer-page">
    <header><h2>Optimizer</h2><p>Best plan found within the selected search limits. Exact global optimality is not guaranteed.</p></header>
    <form className="optimizer-controls" onSubmit={submit}>{fields.map(([key, label]) => <label key={key}>{label}<input aria-label={label} type="number" min="1" max={limits[key]} step="1" value={values[key]} disabled={running} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></label>)}
      <div className="optimizer-mode"><strong>Continuous mode: {world.player.continuousMode ? "On" : "Off"}</strong><small>Used only as a tie-break preference; realized profit remains the primary goal.</small></div>
      <button type="submit" disabled={running}>{running ? "Running optimizer..." : "Run Optimizer"}</button>
    </form>
    {error && <div className="page-alert" role="alert">{error}</div>}
    {!result && !running && !error && <div className="page-state">Set the search limits, then run the optimizer to find a trade plan.</div>}
    {running && <div className="page-state" role="status">Searching trade and travel plans...</div>}
    {result && <>
      <div className="optimizer-summary">
        <div><span>Best realized profit</span><strong>{result.accumulatedProfit.toLocaleString()} {world.settings.currency}</strong></div>
        <div><span>Final player money</span><strong>{result.finalState.player.money.toLocaleString()} {world.settings.currency}</strong></div>
        <div><span>Route</span><strong>{villageName(world.player.currentVillageId)} → {villageName(result.finalState.player.location)}</strong></div>
        <div><span>Simulation time</span><strong>{timeLabel({ day: world.simulation.startDay, hour: world.simulation.startHour })} → {timeLabel(result.finalState.time)}</strong></div>
        <div><span>Plan actions</span><strong>{result.plan.length}</strong></div><div><span>Search time</span><strong>{result.statistics.elapsedMs.toFixed(1)} ms</strong></div>
      </div>
      {result.accumulatedProfit <= 0 && <div className="optimizer-notice">No profitable plan was found within these search limits.</div>}
      <div className="optimizer-results-grid"><section className="optimizer-card"><h3>Best plan</h3>{result.plan.length === 0 ? <p>No actions were selected.</p> : <ol className="optimizer-plan">{result.plan.map((step, index) => <StepRow key={index} step={step} index={index} world={world} previousVillageId={index === 0 ? world.player.currentVillageId : result.plan[index - 1].villageId} previousProfit={index === 0 ? 0 : result.plan[index - 1].accumulatedProfit} />)}</ol>}</section>
        <div className="optimizer-side"><section className="optimizer-card"><h3>Final state</h3><dl><div><dt>Village</dt><dd>{villageName(result.finalState.player.location)}</dd></div><div><dt>Money</dt><dd>{result.finalState.player.money.toLocaleString()} {world.settings.currency}</dd></div><div><dt>Realized profit</dt><dd>{result.finalState.accumulatedProfit.toLocaleString()} {world.settings.currency}</dd></div><div><dt>Crates</dt><dd>{usedCrates} used / {world.player.inventoryCapacityCrates} capacity</dd></div><div><dt>Time</dt><dd>{timeLabel(result.finalState.time)}</dd></div></dl><h4>Inventory</h4>{result.finalState.player.inventory.length === 0 ? <p>Inventory is empty.</p> : <ul>{result.finalState.player.inventory.map((item) => <li key={item.productId}>{productName(item.productId)}: {item.quantity.toLocaleString()}</li>)}</ul>}</section>
          <section className="optimizer-card optimizer-statistics"><h3>Search statistics</h3><dl><div><dt>Expanded</dt><dd>{result.statistics.expandedStates.toLocaleString()}</dd></div><div><dt>Generated</dt><dd>{result.statistics.generatedStates.toLocaleString()}</dd></div><div><dt>Deduplicated</dt><dd>{result.statistics.deduplicatedStates.toLocaleString()}</dd></div><div><dt>Maximum frontier</dt><dd>{result.statistics.maxFrontierSize.toLocaleString()}</dd></div><div><dt>Elapsed</dt><dd>{result.statistics.elapsedMs.toFixed(1)} ms</dd></div></dl></section></div></div>
    </>}
  </section>;
}
