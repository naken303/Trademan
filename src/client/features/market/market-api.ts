import type { Market } from "../../../shared/types";

const API_BASE = "/api/markets";

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const data = (await response.json()) as
    | T
    | { error?: string };

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed: ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export async function getMarkets(): Promise<
  Market[]
> {
  const response = await fetch(API_BASE);

  return parseResponse<Market[]>(response);
}

export async function getMarketById(
  marketId: string,
): Promise<Market> {
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(marketId)}`,
  );

  return parseResponse<Market>(response);
}

export async function createMarket(
  market: Omit<Market, "id">,
): Promise<Market> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(market),
  });

  return parseResponse<Market>(response);
}

export async function updateMarket(
  marketId: string,
  market: Omit<Market, "id">,
): Promise<Market> {
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(marketId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(market),
    },
  );

  return parseResponse<Market>(response);
}

export async function deleteMarket(
  marketId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/${encodeURIComponent(marketId)}`,
    {
      method: "DELETE",
    },
  );

  await parseResponse<{ success: boolean }>(
    response,
  );
}