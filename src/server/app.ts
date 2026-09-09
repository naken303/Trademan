import express from "express";
import path from "node:path";

import { initializeDatabase } from "./database";
import { marketsRouter } from "./routes/markets";
import { productsRouter } from "./routes/products";
import { worldRouter } from "./routes/world";

export function createApp() {
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

  return app;
}
