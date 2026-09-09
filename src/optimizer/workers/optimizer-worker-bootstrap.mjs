try {
  await import("./optimizer-worker.js");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
  if (!process.geteuid) Object.defineProperty(process, "geteuid", { value: () => 0 });
  await import("tsx/esm");
  await import("./optimizer-worker.ts");
}
