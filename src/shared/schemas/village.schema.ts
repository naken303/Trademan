import { z } from "zod";
import { durationSchema, positionSchema } from "./common.schema";

export const villageResetSchema = z.object({
  current: durationSchema.refine(
    (duration) => duration.days > 0 || duration.hours > 0,
    "Reset duration must be greater than zero",
  ),
  afterReset: durationSchema.refine(
    (duration) => duration.days > 0 || duration.hours > 0,
    "Reset duration must be greater than zero",
  ),
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
