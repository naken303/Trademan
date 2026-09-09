import express from "express";
import path from "node:path";

import { initializeDatabase } from "./database";
import { marketsRouter } from "./routes/markets";
import { productsRouter } from "./routes/products";
import { routesRouter } from "./routes/routes";
import { worldRouter } from "./routes/world";
import { createOptimizerRouter, type OptimizerRunner } from "./routes/optimizer";

export function createApp(options: { optimizerRunner?: OptimizerRunner } = {}) {
  initializeDatabase();

  const app = express();
  app.use(express.json());
  app.use(
    "/assets",
    express.static(path.resolve(process.cwd(), "assets")),
  );
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/world", worldRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/markets", marketsRouter);
  app.use("/api/routes", routesRouter);
  app.use("/api/optimizer", createOptimizerRouter(options.optimizerRunner));

  return app;
}
