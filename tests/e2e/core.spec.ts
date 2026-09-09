import { expect, test } from "playwright/test";
import { worldDataSchema } from "../../src/shared/schemas";

test("app loads and core navigation pages initialize", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "World", exact: true })).toBeVisible();

  for (const [link, heading] of [
    ["Products", "Products"],
    ["Villages", "Village Management"],
    ["Routes", "Route Management"],
    ["Market", "Market Management"],
    ["Database & Settings", "Database & Settings"],
    ["Simulation", "Simulation"],
  ] as const) {
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }

  await expect(page.getByText("Day 1, 0:00")).toBeVisible();
  await expect(page.getByText("Village A", { exact: true }).first()).toBeVisible();
});

test("simulation UI completes buy, travel, and partial sell", async ({ page }) => {
  await page.goto("/simulator");
  await expect(page.getByRole("heading", { name: "Simulation" })).toBeVisible();

  const vegetableSupply = page.locator(".simulation-trade-row").filter({ hasText: "Vegetable" });
  await vegetableSupply.getByLabel("Quantity").fill("10");
  await vegetableSupply.getByRole("button", { name: "Buy" }).click();
  await expect(page.getByText("880 THB", { exact: true })).toBeVisible();
  await expect(page.getByText("1 / 20", { exact: true })).toBeVisible();
  await expect(page.getByText("10 units", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Village B/ }).click();
  await page.getByRole("button", { name: /Village D/ }).click();
  await expect(page.getByText("Day 1, 9:00", { exact: true })).toBeVisible();
  await expect(page.getByText("0d 3h", { exact: true })).toBeVisible();

  const vegetableDemand = page.locator(".simulation-trade-row").filter({ hasText: "Vegetable" });
  await vegetableDemand.getByLabel("Quantity").fill("5");
  await vegetableDemand.getByRole("button", { name: "Sell" }).click();
  await expect(page.getByText("980 THB", { exact: true })).toBeVisible();
  await expect(page.getByText("40 THB", { exact: true })).toBeVisible();
  await expect(page.getByText("5 units", { exact: true })).toBeVisible();
  await expect(page.getByText(/Village reserve:/).locator("strong")).toHaveText("900 THB");
});

test("export is valid and rejected import leaves persisted world unchanged", async ({ request }) => {
  const beforeResponse = await request.get("http://127.0.0.1:3100/api/world/export");
  expect(beforeResponse.ok()).toBe(true);
  const before = worldDataSchema.parse(await beforeResponse.json());

  const invalidResponse = await request.post("http://127.0.0.1:3100/api/world/import", {
    data: { ...before, player: { ...before.player, money: -1 } },
  });
  expect(invalidResponse.status()).toBe(400);

  const afterResponse = await request.get("http://127.0.0.1:3100/api/world");
  expect(worldDataSchema.parse(await afterResponse.json())).toEqual(before);
});
