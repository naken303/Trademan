import { Router } from "express";
import { randomUUID } from "node:crypto";

import {
  createMarket,
  deleteMarket,
  getAllMarkets,
  getMarketById,
  updateMarket,
} from "../database/repositories/market-repository";

import {
  getProductById,
} from "../database/repositories/product-repository";

import {
  getVillageById,
} from "../database/repositories/village-repository";

import {
  marketSchema,
} from "../../shared/schemas";

const marketsRouter = Router();

function getId(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/**
 * GET /api/markets
 */
marketsRouter.get("/", (_req, res) => {
  try {
    const markets = getAllMarkets();

    res.json(markets);
  } catch (error) {
    console.error("Failed to load markets:", error);

    res.status(500).json({
      error: "Failed to load markets",
    });
  }
});

/**
 * GET /api/markets/:id
 */
marketsRouter.get("/:id", (req, res) => {
  try {
    const marketId = getId(req.params.id);

    if (!marketId) {
      res.status(400).json({
        error: "Market id is required",
      });
      return;
    }

    const market = getMarketById(marketId);

    if (!market) {
      res.status(404).json({
        error: "Market not found",
      });
      return;
    }

    res.json(market);
  } catch (error) {
    console.error("Failed to load market:", error);

    res.status(500).json({
      error: "Failed to load market",
    });
  }
});

/**
 * POST /api/markets
 *
 * Client does NOT provide id.
 * Server generates the id.
 */
marketsRouter.post("/", (req, res) => {
  try {
    const bodySchema = marketSchema.omit({
      id: true,
    });

    const parsed = bodySchema.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues,
      });
      return;
    }

    const village =
      getVillageById(parsed.data.villageId);

    if (!village) {
      res.status(400).json({
        error: `Village not found: ${parsed.data.villageId}`,
      });
      return;
    }

    const product =
      getProductById(parsed.data.productId);

    if (!product) {
      res.status(400).json({
        error: `Product not found: ${parsed.data.productId}`,
      });
      return;
    }

    const market = {
      id: randomUUID(),
      ...parsed.data,
    };

    createMarket(market);

    res.status(201).json(market);
  } catch (error) {
    console.error("Failed to create market:", error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to create market",
    });
  }
});

/**
 * PUT /api/markets/:id
 */
marketsRouter.put("/:id", (req, res) => {
  try {
    const marketId = getId(req.params.id);

    if (!marketId) {
      res.status(400).json({
        error: "Market id is required",
      });
      return;
    }

    const parsed = marketSchema
      .omit({
        id: true,
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues,
      });
      return;
    }

    const existingMarket =
      getMarketById(marketId);

    if (!existingMarket) {
      res.status(404).json({
        error: "Market not found",
      });
      return;
    }

    const village =
      getVillageById(parsed.data.villageId);

    if (!village) {
      res.status(400).json({
        error: `Village not found: ${parsed.data.villageId}`,
      });
      return;
    }

    const product =
      getProductById(parsed.data.productId);

    if (!product) {
      res.status(400).json({
        error: `Product not found: ${parsed.data.productId}`,
      });
      return;
    }

    const market = {
      id: marketId,
      ...parsed.data,
    };

    updateMarket(market);

    res.json(market);
  } catch (error) {
    console.error("Failed to update market:", error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to update market",
    });
  }
});

/**
 * DELETE /api/markets/:id
 */
marketsRouter.delete("/:id", (req, res) => {
  try {
    const marketId = getId(req.params.id);

    if (!marketId) {
      res.status(400).json({
        error: "Market id is required",
      });
      return;
    }

    const market = getMarketById(marketId);

    if (!market) {
      res.status(404).json({
        error: "Market not found",
      });
      return;
    }

    deleteMarket(marketId);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete market:", error);

    res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete market",
    });
  }
});

export { marketsRouter };