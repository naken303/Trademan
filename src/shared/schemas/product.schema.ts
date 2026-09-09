import { z } from "zod";

export const productImageSchema = z.object({
  type: z.literal("file"),
  path: z.string().min(1),
});

export const productSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  unitsPerCrate: z.number().int().positive(),
  image: productImageSchema.optional(),
});