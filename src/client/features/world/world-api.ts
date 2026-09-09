import type {
  Position,
  Village,
  WorldData,
} from "../../../shared/types";

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

  return parseResponse<WorldData>(response);
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

  return parseResponse<Village>(response);
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

  return parseResponse<Village>(response);
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

  return parseResponse<Village>(response);
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