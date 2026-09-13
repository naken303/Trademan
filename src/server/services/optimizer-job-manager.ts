import { randomUUID } from "node:crypto";
import type { OptimizerResult, OptimizerSearchOptions, OptimizerSearchStatistics } from "../../optimizer";
import type { WorldData } from "../../shared/types";
import { startOptimizerWorker, type OptimizerWorkerRun } from "./optimizer-worker-runner";

export type OptimizerJobStatus = "starting" | "running" | "braking" | "completed" | "failed";
export interface OptimizerJob { runId: string; status: OptimizerJobStatus; progress?: OptimizerSearchStatistics; result?: OptimizerResult; error?: string; }

/** Local single-user job registry. One worker prevents concurrent searches competing for heap. */
export class OptimizerJobManager {
  private current?: OptimizerJob & { worker?: OptimizerWorkerRun };

  start(world: WorldData, options: OptimizerSearchOptions): OptimizerJob {
    if (this.current && (this.current.status === "starting" || this.current.status === "running" || this.current.status === "braking")) throw new Error("OPTIMIZER_RUN_ACTIVE");
    const job: OptimizerJob & { worker?: OptimizerWorkerRun } = { runId: randomUUID(), status: "starting" };
    this.current = job;
    const worker = startOptimizerWorker(world, options, { onProgress: (progress) => { job.progress = progress; if (job.status === "starting") job.status = "running"; } });
    job.worker = worker; job.status = "running";
    void worker.result.then((result) => { job.result = result; job.progress = result.statistics; job.status = "completed"; delete job.worker; })
      .catch(() => { job.error = "Optimizer execution failed"; job.status = "failed"; delete job.worker; });
    return job;
  }

  get(runId?: string) { return runId ? (this.current?.runId === runId ? this.current : undefined) : this.current; }
  brake(runId: string) {
    const job = this.get(runId);
    if (!job) return undefined;
    if (job.status === "running") { job.status = "braking"; job.worker?.brake(); }
    return job;
  }
}
