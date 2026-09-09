import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import type {
  WorldData,
} from "../../shared/types";

import {
  worldDataSchema,
} from "../../shared/schemas";

import {
  importWorld,
} from "./world-importer";

export function loadDemoWorld(): WorldData {
  const filePath = resolve(
    process.cwd(),
    "database",
    "seed",
    "demo-world.json",
  );

  const raw = readFileSync(
    filePath,
    "utf-8",
  );

  const data =
    worldDataSchema.parse(
      JSON.parse(raw),
    );

  importWorld(data);

  return data;
}