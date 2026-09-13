import type { OptimizerResult, OptimizerSearchOptions, OptimizerSearchStatistics } from "../../../optimizer";

export type OptimizerRunRequest = OptimizerSearchOptions;
export interface OptimizerJobResponse { runId: string; status: "starting" | "running" | "braking" | "completed" | "failed"; progress?: OptimizerSearchStatistics; result?: OptimizerResult; error?: string; }

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, init); const data = await response.json() as OptimizerJobResponse | { error?: string };
  if (!response.ok) throw new Error("error" in data && data.error ? data.error : "Optimizer is unavailable. Try again.");
  return data as OptimizerJobResponse;
}
export function startOptimizer(options: OptimizerRunRequest) { return request("/api/optimizer/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options) }); }
export function getOptimizerRun(runId: string) { return request(`/api/optimizer/runs/${runId}`); }
export function getCurrentOptimizerRun() { return request("/api/optimizer/runs/current"); }
export function brakeOptimizer(runId: string) { return request(`/api/optimizer/runs/${runId}/brake`, { method: "POST" }); }
