import { z } from "zod";
import { durationSchema } from "./common.schema";

export const routeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  travelTime: durationSchema,
});