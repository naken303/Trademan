import { expect, test } from "playwright/test";
import { worldDataSchema } from "../../src/shared/schemas";

test("core pages load without browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  for (const [path, heading] of [["world", "World"], ["products", "Product Management"], ["villages", "Village Management"], ["routes", "Route Management"], ["market", "Market Management"], ["settings", "Database & Settings"], ["simulator", "Simulation"], ["optimizer", "Optimizer"]]) {
    await page.goto(`/${path}`);
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("CRUD UI persists revised contracts", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/products");
  await page.getByRole("button", { name: "+ Add Product" }).click();
  await expect(page.getByLabel("Product ID")).toHaveCount(0);
  await page.getByLabel("Name").fill("Audit Product");
  await page.getByLabel("Category").selectOption("Military");
  await page.getByLabel("Units per crate").fill("20");
  await page.getByRole("button", { name: "Add Product", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Audit Product" })).toBeVisible();
  let world = worldDataSchema.parse(await (await request.get("http://127.0.0.1:3100/api/world")).json());
  const product = world.products.find((item) => item.name === "Audit Product")!;
  expect(product.id).toMatch(/^P\d{6}$/);
  expect(product.category).toBe("Military");

  await page.goto("/villages");
  await page.getByRole("button", { name: "+ Add Village" }).click();
  await expect(page.getByText("Current Reset", { exact: true })).toHaveCount(0);
  await page.getByLabel("Village Name").fill("Audit Village");
  await page.getByLabel("Initial Reserve Money").fill("800");
  await page.locator("#village-after-hours").fill("8");
  await page.getByRole("button", { name: "Add Village", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Audit Village" })).toBeVisible();
  world = worldDataSchema.parse(await (await request.get("http://127.0.0.1:3100/api/world")).json());
  const village = world.villages.find((item) => item.name === "Audit Village")!;

  await page.goto("/routes");
  await page.getByRole("button", { name: "+ Add Route" }).click();
  await page.locator(".route-form select").nth(0).selectOption("A");
  await page.locator(".route-form select").nth(1).selectOption(village.id);
  await page.getByLabel("Forward hours").fill("2");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const routeRow = page.locator("tr").filter({ hasText: "Audit Village" }).filter({ hasText: "Village A" });
  await expect(routeRow).toContainText("Same as forward");
  await routeRow.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Use different return travel time").check();
  await page.getByLabel("Return hours").fill("5");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await page.goto("/market");
  await page.getByRole("button", { name: "+ Add Market" }).click();
  await page.getByLabel("Village", { exact: true }).last().selectOption(village.id);
  await page.getByLabel("Product").selectOption(product.id);
  await page.getByLabel("Unit Price").fill("5");
  await page.getByLabel("Quantity (Units)").fill("30");
  await expect(page.getByLabel("Quantity (Crates)")).toHaveValue("1.5");
  await page.getByLabel("Quantity (Crates)").fill("2.25");
  await expect(page.getByLabel("Quantity (Units)")).toHaveValue("45");
  await page.getByRole("button", { name: "Add Market", exact: true }).click();

  world = worldDataSchema.parse(await (await request.get("http://127.0.0.1:3100/api/world")).json());
  const route = world.routes.find((item) => new Set([item.from, item.to]).has("A") && new Set([item.from, item.to]).has(village.id))!;
  expect(route).toMatchObject({ travelTime: { days: 0, hours: 2 }, reverseTravelTime: { days: 0, hours: 5 } });
  expect(world.markets).toContainEqual(expect.objectContaining({ villageId: village.id, productId: product.id, initialQuantity: 45 }));
  await page.goto("/world");
  await expect(page.getByTestId(`palette-product-${product.id}`)).not.toContainText(product.id);
  const edge = page.locator(`[data-route-id="${route.id}"]`).first();
  await expect(edge).toBeVisible();
  await expect(page.getByTestId(`route-label-${route.id}`)).toHaveText("2h / 5h");
  await page.getByTestId(`palette-product-${product.id}`).dragTo(page.getByTestId("village-node-A"));
  await page.getByLabel("Quantity (Units)").fill("30");
  await expect(page.getByLabel("Quantity (Crates)")).toHaveValue("1.5");
  await page.getByLabel("Quantity (Crates)").fill("2.25");
  await expect(page.getByLabel("Quantity (Units)")).toHaveValue("45");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(errors).toEqual([]);
});

test("simulation and optimizer share visual run-specific reset setup", async ({ page }) => {
  const pageErrors: string[] = [];
  const villageWrites: string[] = [];
  const optimizerPayloads: unknown[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (/\/api\/villages(?:\/|$)/.test(request.url()) && request.method() !== "GET") villageWrites.push(`${request.method()} ${request.url()}`);
    if (request.url().endsWith("/api/optimizer/run") && request.method() === "POST") optimizerPayloads.push(request.postDataJSON());
  });
  await page.goto("/simulator");
  const simulationCards = page.locator(".village-reset-card");
  await expect(simulationCards).toHaveCount(5);
  await expect(page.getByTestId("village-reset-card-A")).toContainText("Village A");
  await page.getByLabel("Village A Current Reset Days").fill("0");
  await page.getByLabel("Village A Current Reset Hours").fill("2");
  await page.getByLabel("Village B Current Reset Days").fill("0");
  await page.getByLabel("Village B Current Reset Hours").fill("4");
  await page.getByRole("button", { name: "Start Simulation" }).click();
  await expect(page.locator(".simulation-village-card").getByText("2h", { exact: true })).toBeVisible();
  expect(villageWrites).toEqual([]);
  await page.getByRole("button", { name: /Audit Village/ }).click();
  await expect(page.getByText("Day 1, 2:00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Village A/ }).click();
  await expect(page.getByText("Day 1, 7:00", { exact: true })).toBeVisible();
  await page.goto("/optimizer");
  await expect(page.getByRole("heading", { name: "Search Configuration" })).toBeVisible();
  await expect(page.locator(".village-reset-card")).toHaveCount(5);
  await page.getByLabel("Village A Current Reset Hours").fill("3");
  await page.getByLabel("Optimization period (days)").fill("1");
  await page.getByLabel("Beam width").fill("20");
  await page.getByLabel("Maximum plan steps").fill("8");
  await page.getByLabel("Maximum expanded states").fill("500");
  await page.getByLabel("Runtime timeout (seconds)").fill("45");
  await page.getByRole("button", { name: "Run Optimizer" }).click();
  await expect(page.getByText("Best realized profit")).toBeVisible({ timeout: 30_000 });
  expect(optimizerPayloads[0]).toMatchObject({ timeoutSeconds: 45, villageResetRemaining: { A: { days: 1, hours: 3 } } });
  await page.getByLabel("Village A Current Reset Hours").fill("5");
  await page.getByRole("button", { name: "Run Optimizer" }).click();
  await expect.poll(() => optimizerPayloads.length).toBe(2);
  expect(optimizerPayloads[1]).toMatchObject({ villageResetRemaining: { A: { days: 1, hours: 5 } } });
  expect(villageWrites).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("rejected import leaves exported world unchanged", async ({ request }) => {
  const before = worldDataSchema.parse(await (await request.get("http://127.0.0.1:3100/api/world/export")).json());
  expect((await request.post("http://127.0.0.1:3100/api/world/import", { data: { ...before, player: { ...before.player, money: -1 } } })).status()).toBe(400);
  expect(worldDataSchema.parse(await (await request.get("http://127.0.0.1:3100/api/world")).json())).toEqual(before);
});
