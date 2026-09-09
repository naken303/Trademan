import type { OptimizerResult, OptimizerSearchOptions } from "../../../optimizer";

export async function runOptimizer(options: OptimizerSearchOptions): Promise<OptimizerResult> {
  const response = await fetch("/api/optimizer/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  const data = await response.json() as OptimizerResult | { error?: unknown };
  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
      ? data.error
      : response.status === 400 ? "Check the optimizer limits and try again."
        : response.status === 504 ? "The optimizer timed out. Try smaller search limits."
          : "Optimizer is unavailable. Try again.";
    throw new Error(message);
  }
  return data as OptimizerResult;
}
