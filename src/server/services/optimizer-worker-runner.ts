import { Worker } from "node:worker_threads";
import type { OptimizerResult, OptimizerSearchOptions, OptimizerWorkerRequest, OptimizerWorkerResponse } from "../../optimizer";
import type { WorldData } from "../../shared/types";

const DEFAULT_TIMEOUT_MS = 30_000;

export class OptimizerTimeoutError extends Error {
  constructor(message = "Optimizer execution timed out") {
    super(message);
    this.name = "OptimizerTimeoutError";
  }
}

export class OptimizerWorkerError extends Error {
  constructor(message = "Optimizer worker failed") {
    super(message);
    this.name = "OptimizerWorkerError";
  }
}

export interface OptimizerWorkerRunnerOptions {
  timeoutMs?: number;
  workerUrl?: URL;
}

export async function runOptimizerInWorker(
  world: WorldData,
  options: OptimizerSearchOptions = {},
  runnerOptions: OptimizerWorkerRunnerOptions = {},
): Promise<OptimizerResult> {
  const worker = new Worker(
    runnerOptions.workerUrl ?? new URL("../../optimizer/workers/optimizer-worker-bootstrap.mjs", import.meta.url),
    { execArgv: [] },
  );
  const request: OptimizerWorkerRequest = { world: structuredClone(world), options: { ...options } };

  return new Promise<OptimizerResult>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => finish(new OptimizerTimeoutError()), runnerOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    const finish = (error?: Error, result?: OptimizerResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      worker.removeAllListeners();
      void worker.terminate();
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new OptimizerWorkerError());
    };

    worker.once("message", (response: OptimizerWorkerResponse) => {
      if (response.ok) finish(undefined, response.result);
      else finish(new OptimizerWorkerError(response.error.message));
    });
    worker.once("error", (error) => finish(new OptimizerWorkerError(error.message)));
    worker.once("exit", (code) => {
      if (code !== 0) finish(new OptimizerWorkerError(`Optimizer worker exited with code ${code}`));
      else finish(new OptimizerWorkerError("Optimizer worker exited without a result"));
    });
    worker.postMessage(request);
  });
}
