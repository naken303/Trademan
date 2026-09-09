import { runMigrations } from "./migrations";

export function initializeDatabase(): void {
  runMigrations();
}

export * from "./connection";
export * from "./repositories";
export * from "./world-importer";
export * from "./seed-loader";