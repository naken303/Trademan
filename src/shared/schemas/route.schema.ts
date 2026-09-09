import { z } from "zod";
import { durationSchema } from "./common.schema";

const routeFields = {
  from: z.string().min(1),
  to: z.string().min(1),
  travelTime: durationSchema,
};

function validateRoute(
  route: { from: string; to: string; travelTime: { days: number; hours: number } },
  context: z.RefinementCtx,
) {
  if (route.from === route.to) {
    context.addIssue({
      code: "custom",
      path: ["to"],
      message: "Route destination must differ from origin",
    });
  }

  if (route.travelTime.days === 0 && route.travelTime.hours === 0) {
    context.addIssue({
      code: "custom",
      path: ["travelTime"],
      message: "Route travel time must be greater than zero",
    });
  }
}

export const routeInputSchema = z.object(routeFields).superRefine(validateRoute);

export const routeSchema = z.object({
  id: z.string().min(1),
  ...routeFields,
}).superRefine(validateRoute);
