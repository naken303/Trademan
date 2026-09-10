import { expect, test } from "playwright/test";
import { worldDataSchema } from "../../src/shared/schemas";

test("app loads and core navigation pages initialize", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "World", exact: true })).toBeVisible();

  for (const [link, heading] of [
    ["Products", "Products"],
    ["Villages", "Village Management"],
    ["Routes", "Route Management"],
    ["Markets", "Market Management"],
    ["Database & Settings", "Database & Settings"],
    ["Simulation", "Simulation"],
    ["Optimizer", "Optimizer"],
  ] as const) {
    await page.getByRole("link", { name: link, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: link, exact: true })).toHaveAttribute("aria-current", "page");
  }

  await page.getByRole("link", { name: "Simulation", exact: true }).click();
  await expect(page.getByText("Day 1, 0:00")).toBeVisible();
  await expect(page.getByText("Village A", { exact: true }).first()).toBeVisible();
});

test("mobile navigation opens without horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/world");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Products", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Products", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("optimizer UI finds and explains a profitable plan", async ({ page }) => {
  await page.goto("/optimizer");
  await expect(page.getByRole("heading", { name: "Optimizer", exact: true })).toBeVisible();
  await page.getByLabel("Optimization period (days)").fill("1");
  await page.getByLabel("Beam width").fill("20");
  await page.getByLabel("Maximum plan steps").fill("8");
  await page.getByLabel("Maximum expanded states").fill("500");
  await page.getByRole("button", { name: "Run Optimizer" }).click();

  await expect(page.getByText("Best realized profit")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".optimizer-summary").getByText(/^[1-9][0-9,]* THB$/).first()).toBeVisible();
  await expect(page.locator(".optimizer-step.buy").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".optimizer-step.travel").first()).toBeVisible();
  await expect(page.locator(".optimizer-step.sell").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Search statistics" })).toBeVisible();
  await expect(page.getByText("Expanded", { exact: true })).toBeVisible();
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

test("World canvas creates and edits a directional route", async ({ page }) => {
  await page.goto("/world");
  const source = await page.getByTestId("route-source-C").boundingBox();
  const target = await page.getByTestId("route-target-D").boundingBox();
  expect(source).not.toBeNull(); expect(target).not.toBeNull();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down(); await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 }); await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Create Route" })).toBeVisible();
  await page.getByLabel("Route hours").fill("6");
  await page.getByRole("button", { name: "Create Route" }).click();
  await expect(page.getByText("0d 6h")).toBeVisible();

  await page.getByTestId("route-source-C").dragTo(page.getByTestId("route-target-D"));
  await expect(page.getByRole("heading", { name: "Edit Route" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Menu" }).isVisible().then(async (mobile) => { if (mobile) { await page.getByRole("button", { name: "Menu" }).click(); } });
  await page.getByRole("link", { name: "Routes", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Village C" }).filter({ hasText: "Village D" }).filter({ hasText: "0d 6h" })).toBeVisible();
});

test("World product drop creates a unique market assignment", async ({ page }) => {
  await page.goto("/world");
  await page.getByTestId("palette-product-MILK").dragTo(page.getByTestId("village-node-B"));
  await expect(page.getByRole("heading", { name: "Add Product to Village" })).toBeVisible();
  await page.getByLabel("Demand").check(); await page.getByLabel("Unit price").fill("11"); await page.getByLabel("Quantity (units)").fill("7");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByTestId("village-node-B")).toContainText("Demand 1");

  await page.getByTestId("palette-product-MILK").dragTo(page.getByTestId("village-node-B"));
  await page.getByLabel("Demand").check();
  await expect(page.getByRole("heading", { name: "Edit Milk Demand" })).toBeVisible();
  await expect(page.getByLabel("Unit price")).toHaveValue("11");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: "Markets", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Village B" }).filter({ hasText: "Milk" }).filter({ hasText: "DEMAND" }).filter({ hasText: "11" })).toBeVisible();
});
