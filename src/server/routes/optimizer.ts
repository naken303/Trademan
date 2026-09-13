import { Router } from "express";
import { z } from "zod";
import type { OptimizerResult, OptimizerSearchOptions } from "../../optimizer";
import type { WorldData } from "../../shared/types";
import { getWorld } from "../database/repositories/world-repository";
import {
  OptimizerTimeoutError,
  runOptimizerInWorker,
  type OptimizerWorkerRunnerOptions,
} from "../services/optimizer-worker-runner";
import { durationSchema } from "../../shared/schemas/common.schema";

const optimizerRequestSchema = z.object({
  periodDays: z.number().int().min(1).max(365).optional(),
  beamWidth: z.number().int().min(1).max(2_000).optional(),
  maxSteps: z.number().int().min(1).max(500).optional(),
  maxExpandedStates: z.number().int().min(1).max(500_000).optional(),
  timeoutSeconds: z.number().int().min(1).max(600).optional(),
  villageResetRemaining: z.record(z.string(), durationSchema.refine(
    (duration) => duration.days > 0 || duration.hours > 0,
    "Current reset remaining must be greater than zero",
  )).optional(),
}).strict();

export type OptimizerRunner = (
  world: WorldData,
  options: OptimizerSearchOptions,
  runnerOptions?: OptimizerWorkerRunnerOptions,
) => Promise<OptimizerResult>;

export function createOptimizerRouter(runner: OptimizerRunner = runOptimizerInWorker) {
  const router = Router();
  router.post("/run", async (req, res) => {
    const parsed = optimizerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    try {
      const world = getWorld();
      if (parsed.data.villageResetRemaining) {
        const expected = new Set(world.villages.map((village) => village.id));
        const supplied = Object.keys(parsed.data.villageResetRemaining);
        if (supplied.length !== expected.size || supplied.some((id) => !expected.has(id))) {
          res.status(400).json({ error: "Current reset remaining is required for every persisted village" });
          return;
        }
      }
      const options: OptimizerSearchOptions = {
        periodDays: parsed.data.periodDays ?? world.optimization.periodDays,
        beamWidth: parsed.data.beamWidth ?? world.optimization.beamWidth,
        maxSteps: parsed.data.maxSteps ?? world.optimization.maxSteps,
        maxExpandedStates: parsed.data.maxExpandedStates,
        villageResetRemaining: parsed.data.villageResetRemaining ?? Object.fromEntries(
          world.villages.map((village) => [village.id, village.reset.afterReset]),
        ),
      };
      const validatedOptions = optimizerRequestSchema.parse(options);
      res.json(await runner(world, validatedOptions, {
        timeoutMs: parsed.data.timeoutSeconds === undefined ? undefined : parsed.data.timeoutSeconds * 1_000,
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Persisted optimization settings exceed safe API limits" });
      } else if (error instanceof OptimizerTimeoutError) {
        res.status(504).json({ error: error.message });
      } else {
        console.error("Optimizer execution failed:", error);
        res.status(500).json({ error: "Optimizer execution failed" });
      }
    }
  });
  return router;
}
