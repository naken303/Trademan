import { useState } from "react";

import type { Route, Village } from "../../../shared/types";
import { routeSchema } from "../../../shared/schemas";

interface Props {
  villages: Village[];
  route?: Route | null;
  onSubmit: (route: Omit<Route, "id">) => Promise<void>;
  onCancel: () => void;
}

export function RouteForm({ villages, route, onSubmit, onCancel }: Props) {
  const [from, setFrom] = useState(route?.from ?? "");
  const [to, setTo] = useState(route?.to ?? "");
  const [days, setDays] = useState(String(route?.travelTime.days ?? 0));
  const [hours, setHours] = useState(String(route?.travelTime.hours ?? 1));
  const [returnAvailable, setReturnAvailable] = useState(route?.returnAvailable !== false);
  const [differentReturn, setDifferentReturn] = useState(route?.reverseTravelTime !== undefined);
  const [returnDays, setReturnDays] = useState(String(route?.reverseTravelTime?.days ?? 0));
  const [returnHours, setReturnHours] = useState(String(route?.reverseTravelTime?.hours ?? 1));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const candidate = {
      id: route?.id ?? "new",
      from,
      to,
      travelTime: { days: Number(days), hours: Number(hours) },
      returnAvailable,
      ...(returnAvailable && differentReturn ? { reverseTravelTime: { days: Number(returnDays), hours: Number(returnHours) } } : {}),
    };
    const parsed = routeSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid route");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        from: parsed.data.from,
        to: parsed.data.to,
        travelTime: parsed.data.travelTime,
        returnAvailable: parsed.data.returnAvailable,
        ...(parsed.data.returnAvailable !== false && parsed.data.reverseTravelTime ? { reverseTravelTime: parsed.data.reverseTravelTime } : {}),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save route");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="route-form" onSubmit={handleSubmit}>
      <label>From<select value={from} onChange={(event) => setFrom(event.target.value)} required>
        <option value="">Select village</option>
        {villages.map((village) => <option key={village.id} value={village.id}>{village.name}</option>)}
      </select></label>
      <label>To<select value={to} onChange={(event) => setTo(event.target.value)} required>
        <option value="">Select village</option>
        {villages.map((village) => <option key={village.id} value={village.id}>{village.name}</option>)}
      </select></label>
      <fieldset><legend>Forward travel time</legend>
        <label>Forward days<input type="number" min="0" step="1" value={days} onChange={(event) => setDays(event.target.value)} required /></label>
        <label>Forward hours<input type="number" min="0" max="23" step="1" value={hours} onChange={(event) => setHours(event.target.value)} required /></label>
      </fieldset>
      <label><input type="checkbox" checked={returnAvailable} onChange={(event) => setReturnAvailable(event.target.checked)} /> Return route available</label>
      {!returnAvailable && <small>Travel is available only from From to To.</small>}
      {returnAvailable && !differentReturn && <small>Return travel time uses the forward travel time when omitted.</small>}
      {returnAvailable && <label><input type="checkbox" checked={differentReturn} onChange={(event) => setDifferentReturn(event.target.checked)} /> Use different return travel time</label>}
      {returnAvailable && differentReturn && <fieldset><legend>Return travel time</legend>
        <label>Return days<input type="number" min="0" step="1" value={returnDays} onChange={(event) => setReturnDays(event.target.value)} required /></label>
        <label>Return hours<input type="number" min="0" max="23" step="1" value={returnHours} onChange={(event) => setReturnHours(event.target.value)} required /></label>
      </fieldset>}
      {error && <div className="route-error">{error}</div>}
      <div className="route-actions">
        <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}
