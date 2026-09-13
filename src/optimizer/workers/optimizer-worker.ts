import { parentPort } from "node:worker_threads";
import { runOptimizer } from "../optimizer";
import type { OptimizerWorkerRequest, OptimizerWorkerResponse } from "../types";
import { createTempOptimizerStateStore } from "../state-store";

const port = parentPort;
if (!port) throw new Error("Optimizer worker requires a parent port");

port.once("message", (request: OptimizerWorkerRequest) => {
  const store = createTempOptimizerStateStore();
  let response: OptimizerWorkerResponse;
  try {
    const brake = request.brakeBuffer ? new Int32Array(request.brakeBuffer) : undefined;
    response = { ok: true, result: runOptimizer(request.world, request.options, {
      shouldBrake: () => brake ? Atomics.load(brake, 0) === 1 : false,
      onProgress: (statistics) => port.postMessage({ type: "progress", statistics } satisfies OptimizerWorkerResponse),
      stateStore: store,
    }) };
  } catch (error) {
    response = {
      ok: false,
      error: { message: error instanceof Error ? error.message : "Optimizer execution failed" },
    };
  }
  store.destroy();
  port.postMessage(response);
  port.close();
});
