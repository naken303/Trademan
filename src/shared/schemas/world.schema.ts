import { z } from "zod";
import { marketSchema } from "./market.schema";
import { productSchema } from "./product.schema";
import { routeSchema } from "./route.schema";
import { villageSchema } from "./village.schema";

export const worldDataSchema = z.object({
  schemaVersion: z.number().int().positive(),

  settings: z.object({
    currency: z.string().min(1),
  }),

  player: z.object({
    currentVillageId: z.string().min(1),
    money: z.number().nonnegative(),
    inventoryCapacityCrates: z.number().int().positive(),
    continuousMode: z.boolean(),
    initialInventory: z.array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCost: z.number().nonnegative(),
      }),
    ),
  }),

  simulation: z.object({
    startDay: z.number().int().positive(),
    startHour: z.number().int().min(0).max(23),
  }),

  optimization: z.object({
    periodDays: z.number().int().positive(),
    beamWidth: z.number().int().positive(),
    maxSteps: z.number().int().positive(),
  }),

  products: z.array(productSchema),
  villages: z.array(villageSchema),
  routes: z.array(routeSchema),
  markets: z.array(marketSchema),
});
