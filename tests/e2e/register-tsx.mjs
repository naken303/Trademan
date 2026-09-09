if (!process.geteuid) {
  Object.defineProperty(process, "geteuid", { value: () => 0 });
}

await import("tsx/esm");
