import { z } from "zod";
import { marketSideSchema } from "./common.schema";

export const marketSchema = z.object({
  id: z.string().min(1),
  villageId: z.string().min(1),
  productId: z.string().min(1),
  side: marketSideSchema,
  unitPrice: z.number().nonnegative(),
  initialQuantity: z.number().int().nonnegative(),
});