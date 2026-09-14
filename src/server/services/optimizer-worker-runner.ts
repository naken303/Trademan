import { Worker } from "node:worker_threads";
import { resolveOptimizerStrategy, type OptimizerResult, type OptimizerSearchOptions, type OptimizerSearchStatistics, type OptimizerWorkerRequest, type OptimizerWorkerResponse } from "../../optimizer";
import type { WorldData } from "../../shared/types";

export class OptimizerWorkerError extends Error {
  constructor(message = "Optimizer worker failed") { super(message); this.name = "OptimizerWorkerError"; }
}

export interface OptimizerWorkerRunnerOptions { workerUrl?: URL; onProgress?: (statistics: OptimizerSearchStatistics) => void; }
export interface OptimizerWorkerRun { result: Promise<OptimizerResult>; brake(): void; }

export function startOptimizerWorker(world: WorldData, options: OptimizerSearchOptions = {}, runnerOptions: OptimizerWorkerRunnerOptions = {}): OptimizerWorkerRun {
  const worker = new Worker(runnerOptions.workerUrl ?? new URL("../../optimizer/workers/optimizer-worker-bootstrap.mjs", import.meta.url), { execArgv: [] });
  const brakeBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const brakeFlag = new Int32Array(brakeBuffer);
  const request: OptimizerWorkerRequest = { world: structuredClone(world), options: structuredClone({ ...options, strategy: resolveOptimizerStrategy(options.strategy) }), brakeBuffer };
  const result = new Promise<OptimizerResult>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, value?: OptimizerResult) => {
      if (settled) return; settled = true; worker.removeAllListeners();
      if (error) reject(error); else if (value) resolve(value); else reject(new OptimizerWorkerError());
    };
    worker.on("message", (response: OptimizerWorkerResponse) => {
      if (!("ok" in response)) { runnerOptions.onProgress?.(response.statistics); return; }
      if (response.ok) finish(undefined, response.result); else finish(new OptimizerWorkerError(response.error.message));
    });
    worker.once("error", (error) => finish(new OptimizerWorkerError(error.message)));
    worker.once("exit", (code) => { if (code !== 0) finish(new OptimizerWorkerError(`Optimizer worker exited with code ${code}`)); });
    worker.postMessage(request);
  });
  return { result, brake: () => Atomics.store(brakeFlag, 0, 1) };
}

export function runOptimizerInWorker(world: WorldData, options: OptimizerSearchOptions = {}, runnerOptions: OptimizerWorkerRunnerOptions = {}) {
  return startOptimizerWorker(world, options, runnerOptions).result;
}
