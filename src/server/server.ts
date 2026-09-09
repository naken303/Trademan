import express from "express";
import path from "node:path";

import { initializeDatabase } from "./database";
import { marketsRouter } from "./routes/markets";
import { productsRouter } from "./routes/products";
import { worldRouter } from "./routes/world";

const app = express();

const port = Number(
  process.env.PORT ?? 3000,
);

app.use(express.json());

initializeDatabase();

app.use(
  "/assets",
  express.static(
    path.resolve(
      process.cwd(),
      "assets",
    ),
  ),
);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use(
  "/api/world",
  worldRouter,
);

app.use(
  "/api/products",
  productsRouter,
);

app.use(
  "/api/markets",
  marketsRouter,
);

app.listen(port, () => {
  console.log(
    `Server running at http://localhost:${port}`,
  );
});