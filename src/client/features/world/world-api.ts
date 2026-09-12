import type {
  Position,
  Village,
  WorldData,
} from "../../../shared/types";
import { worldDataSchema } from "../../../shared/schemas";
import { villageSchema } from "../../../shared/schemas/village.schema";
import { z } from "zod";

const API_BASE = "/api/world";

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const data = (await response.json()) as
    | T
    | { error?: unknown };

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data
    ) {
      const error = data.error;

      if (typeof error === "string") {
        message = error;
      }
    }

    throw new Error(message);
  }

  return data as T;
}

export async function getWorld(): Promise<WorldData> {
  const response = await fetch(API_BASE);
  return worldDataSchema.parse(await parseResponse<unknown>(response));
}

export async function importWorldData(input: unknown): Promise<WorldData> {
  const world = worldDataSchema.parse(input);
  const response = await fetch(`${API_BASE}/import`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(world),
  });
  return worldDataSchema.parse(await parseResponse<unknown>(response));
}

export async function saveWorldData(input: WorldData): Promise<WorldData> {
  const world = worldDataSchema.parse(input);
  const response = await fetch(API_BASE, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(world),
  });
  return worldDataSchema.parse(await parseResponse<unknown>(response));
}

export async function createWorldBackup(): Promise<string> {
  const response = await fetch(`${API_BASE}/backup`, { method: "POST" });
  const result = z.object({ filename: z.string().min(1) }).parse(await parseResponse<unknown>(response));
  return result.filename;
}

export async function downloadWorldExport(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.blob();
}

export async function updateVillagePosition(
  villageId: string,
  position: Position,
): Promise<Village> {
  const response = await fetch(
    `${API_BASE}/villages/${encodeURIComponent(villageId)}/position`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(position),
    },
  );

  return villageSchema.parse(await parseResponse<unknown>(response));
}

export async function createVillage(
  village: Omit<Village, "id">,
): Promise<Village> {
  const response = await fetch(
    `${API_BASE}/villages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(village),
    },
  );

  return villageSchema.parse(await parseResponse<unknown>(response));
}

export async function updateVillage(
  villageId: string,
  village: Omit<Village, "id">,
): Promise<Village> {
  const response = await fetch(
    `${API_BASE}/villages/${encodeURIComponent(villageId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(village),
    },
  );

  return villageSchema.parse(await parseResponse<unknown>(response));
}

export async function deleteVillage(
  villageId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/villages/${encodeURIComponent(villageId)}`,
    {
      method: "DELETE",
    },
  );

  await parseResponse<{
    success: boolean;
  }>(response);
}
