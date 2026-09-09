import { Router } from "express";
import { z } from "zod";
import type { OptimizerResult, OptimizerSearchOptions } from "../../optimizer";
import type { WorldData } from "../../shared/types";
import { getWorld } from "../database/repositories/world-repository";
import { OptimizerTimeoutError, runOptimizerInWorker } from "../services/optimizer-worker-runner";

const optimizerRequestSchema = z.object({
  periodDays: z.number().int().min(1).max(365).optional(),
  beamWidth: z.number().int().min(1).max(2_000).optional(),
  maxSteps: z.number().int().min(1).max(500).optional(),
  maxExpandedStates: z.number().int().min(1).max(500_000).optional(),
}).strict().default({});

export type OptimizerRunner = (world: WorldData, options: OptimizerSearchOptions) => Promise<OptimizerResult>;

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
      const options: OptimizerSearchOptions = {
        periodDays: parsed.data.periodDays ?? world.optimization.periodDays,
        beamWidth: parsed.data.beamWidth ?? world.optimization.beamWidth,
        maxSteps: parsed.data.maxSteps ?? world.optimization.maxSteps,
        maxExpandedStates: parsed.data.maxExpandedStates,
      };
      const validatedOptions = optimizerRequestSchema.parse(options);
      res.json(await runner(world, validatedOptions));
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
