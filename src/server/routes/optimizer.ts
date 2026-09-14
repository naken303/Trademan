import { Router } from "express";
import { z } from "zod";
import type { OptimizerSearchOptions } from "../../optimizer";
import { durationSchema } from "../../shared/schemas/common.schema";
import { getWorld } from "../database/repositories/world-repository";
import { OptimizerJobManager } from "../services/optimizer-job-manager";

const requestSchema = z.object({
  periodDays: z.number().int().min(1).max(365).optional(), beamWidth: z.number().int().min(1).max(2_000).optional(),
  maxSteps: z.number().int().min(1).max(500).optional(), maxExpandedStates: z.number().int().min(1).max(500_000).optional(),
  targetProfit: z.number().finite().positive().optional(),
  strategy: z.object({
    preset: z.enum(["baseline", "balanced", "optimized", "custom"]).optional(),
    smartTradeIntelligence: z.boolean().optional(), smartTravelPruning: z.boolean().optional(),
    profitableBuyPruning: z.boolean().optional(), crateQuantityCandidates: z.boolean().optional(),
    sellDominance: z.boolean().optional(), reachableDemandScoring: z.boolean().optional(),
    tradeChainScoring: z.boolean().optional(),
  }).strict().optional(),
  villageResetRemaining: z.record(z.string(), durationSchema.refine((value) => value.days > 0 || value.hours > 0)).optional(),
}).strict();

export function createOptimizerRouter(manager = new OptimizerJobManager()) {
  const router = Router();
  router.post("/runs", (req, res) => {
    const parsed = requestSchema.safeParse(req.body); if (!parsed.success) { res.status(400).json({ error: parsed.error.issues }); return; }
    const world = getWorld();
    if (parsed.data.villageResetRemaining) {
      const expected = new Set(world.villages.map((village) => village.id)); const supplied = Object.keys(parsed.data.villageResetRemaining);
      if (supplied.length !== expected.size || supplied.some((id) => !expected.has(id))) { res.status(400).json({ error: "Current reset remaining is required for every persisted village" }); return; }
    }
    const options: OptimizerSearchOptions = { periodDays: parsed.data.periodDays ?? world.optimization.periodDays, beamWidth: parsed.data.beamWidth ?? world.optimization.beamWidth, maxSteps: parsed.data.maxSteps ?? world.optimization.maxSteps, maxExpandedStates: parsed.data.maxExpandedStates, targetProfit: parsed.data.targetProfit, strategy: parsed.data.strategy, villageResetRemaining: parsed.data.villageResetRemaining ?? Object.fromEntries(world.villages.map((village) => [village.id, village.reset.afterReset])) };
    if (!requestSchema.safeParse(options).success) { res.status(400).json({ error: "Persisted optimization settings exceed safe API limits" }); return; }
    try { const job = manager.start(world, options); res.status(202).json({ runId: job.runId, status: job.status }); }
    catch (error) { if (error instanceof Error && error.message === "OPTIMIZER_RUN_ACTIVE") res.status(409).json({ error: "An optimizer run is already active" }); else res.status(500).json({ error: "Optimizer execution failed" }); }
  });
  router.get("/runs/current", (_req, res) => { const job = manager.get(); res.json(job ?? { status: "completed" }); });
  router.get("/runs/:runId", (req, res) => { const job = manager.get(req.params.runId); if (!job) { res.status(404).json({ error: "Optimizer run not found" }); return; } res.json(job); });
  router.post("/runs/:runId/brake", (req, res) => { const job = manager.brake(req.params.runId); if (!job) { res.status(404).json({ error: "Optimizer run not found" }); return; } res.json({ runId: job.runId, status: job.status }); });
  return router;
}
