import { z } from "zod";
import { durationSchema, positionSchema } from "./common.schema";

export const villageResetSchema = z.object({
  current: durationSchema,
  afterReset: durationSchema,
});

export const villageVisualSchema = z.object({
  icon: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
});

export const villageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  position: positionSchema,
  visual: villageVisualSchema.optional(),
  initialReserveMoney: z.number().nonnegative(),
  reset: villageResetSchema,
});