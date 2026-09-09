import { z } from "zod";

export const durationSchema = z.object({
  days: z.number().int().min(0),
  hours: z.number().int().min(0).max(23),
});

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const marketSideSchema = z.enum(["supply", "demand"]);