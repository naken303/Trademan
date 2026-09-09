import { parentPort } from "node:worker_threads";
import { runOptimizer } from "../optimizer";
import type { OptimizerWorkerRequest, OptimizerWorkerResponse } from "../types";

const port = parentPort;
if (!port) throw new Error("Optimizer worker requires a parent port");

port.once("message", (request: OptimizerWorkerRequest) => {
  let response: OptimizerWorkerResponse;
  try {
    response = { ok: true, result: runOptimizer(request.world, request.options) };
  } catch (error) {
    response = {
      ok: false,
      error: { message: error instanceof Error ? error.message : "Optimizer execution failed" },
    };
  }
  port.postMessage(response);
  port.close();
});
