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
  await expect(page.getByText("3h", { exact: true })).toBeVisible();

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
  await expect(page.getByText("6h", { exact: true })).toBeVisible();

  await page.getByTestId("route-source-C").dragTo(page.getByTestId("route-target-D"));
  await expect(page.getByRole("heading", { name: "Edit Route" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Menu" }).isVisible().then(async (mobile) => { if (mobile) { await page.getByRole("button", { name: "Menu" }).click(); } });
  await page.getByRole("link", { name: "Routes", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Village C" }).filter({ hasText: "Village D" }).filter({ hasText: "6h" })).toBeVisible();
});

test("World canvas separates reverse routes and keeps geometry stable after a saved drag", async ({ page }) => {
  await page.goto("/world");
  const source = await page.getByTestId("route-source-left-B").boundingBox();
  const target = await page.getByTestId("route-target-right-A").boundingBox();
  expect(source).not.toBeNull(); expect(target).not.toBeNull();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down(); await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 }); await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Create Route" })).toBeVisible();
  await page.getByLabel("Route hours").fill("7");
  await page.getByRole("button", { name: "Create Route" }).click();

  const forward = page.locator('[data-route-from="A"][data-route-to="B"]');
  const reverse = page.locator('[data-route-from="B"][data-route-to="A"]');
  await expect(forward).toHaveAttribute("data-reverse-pair", "true");
  await expect(reverse).toHaveAttribute("data-reverse-pair", "true");
  await expect(forward).toHaveAttribute("data-curve-side", "1");
  await expect(reverse).toHaveAttribute("data-curve-side", "-1");
  await expect(forward.locator(".directional-route-path")).toHaveAttribute("marker-end", /.+/);
  await expect(reverse.locator(".directional-route-path")).toHaveAttribute("marker-end", /.+/);
  const forwardPath = await forward.locator(".directional-route-path").getAttribute("d");
  const reversePath = await reverse.locator(".directional-route-path").getAttribute("d");
  const forwardId = await forward.getAttribute("data-route-id");
  const reverseId = await reverse.getAttribute("data-route-id");
  expect(forwardId).not.toBeNull(); expect(reverseId).not.toBeNull();
  expect(forwardPath).not.toBe(reversePath);
  await expect(page.getByTestId(`route-label-${forwardId}`)).toHaveText("4h");
  await expect(page.getByTestId(`route-label-${reverseId}`)).toHaveText("7h");
  await forward.locator(".directional-route-path").click({ force: true });
  await expect(forward).toHaveClass(/selected/);
  expect(await forward.locator(".directional-route-path").getAttribute("d")).toBe(forwardPath);

  await page.getByTestId(`route-label-${reverseId}`).dblclick();
  await expect(page.getByRole("heading", { name: "Edit Route" })).toBeVisible();
  await page.getByLabel("Route hours").fill("8");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByTestId(`route-label-${forwardId}`)).toHaveText("4h");
  await expect(page.getByTestId(`route-label-${reverseId}`)).toHaveText("8h");

  const village = page.locator('.react-flow__node[data-id="B"]');
  const villageBox = await village.boundingBox();
  expect(villageBox).not.toBeNull();
  const pathBeforeDrag = await forward.locator(".directional-route-path").getAttribute("d");
  await page.mouse.move(villageBox!.x + villageBox!.width / 2, villageBox!.y + 30);
  await page.mouse.down(); await page.mouse.move(villageBox!.x + villageBox!.width / 2 + 70, villageBox!.y + 90, { steps: 10 }); await page.mouse.up();
  const pathAfterDrag = await forward.locator(".directional-route-path").getAttribute("d");
  expect(pathAfterDrag).not.toBe(pathBeforeDrag);
  await page.getByRole("button", { name: "Save positions" }).click();
  await page.reload();
  await expect(page.locator('[data-route-from="A"][data-route-to="B"]')).toHaveAttribute("data-curve-side", "1");
  expect(await page.locator('[data-route-from="A"][data-route-to="B"] .directional-route-path').getAttribute("d")).toBe(pathAfterDrag);
});

test("World product palette modes preserve drag defaults and persisted market prices", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/world");
  await expect(page.getByRole("button", { name: "Show product images" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".product-palette-list").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(3);
  await page.setViewportSize({ width: 600, height: 900 });
  expect(await page.locator(".product-palette-list").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByLabel("Search products").fill("milk");
  await expect(page.getByTestId("palette-product-MILK")).toBeVisible();
  await page.getByRole("button", { name: "Show product details" }).click();
  await expect(page.getByTestId("palette-product-MILK")).toContainText("MILK");
  await page.getByTestId("palette-product-MILK").dragTo(page.getByTestId("village-node-B"));
  await expect(page.getByRole("heading", { name: "Add Product to Village" })).toBeVisible();
  await expect(page.getByLabel("Unit price")).toHaveValue("20");
  await page.getByLabel("Demand").check();
  await expect(page.getByLabel("Unit price")).toHaveValue("");
  await page.getByLabel("Supply").check();
  await expect(page.getByLabel("Unit price")).toHaveValue("20");
  await page.getByLabel("Quantity (units)").fill("7");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByTestId("village-node-B")).toContainText("Supply 1");

  await page.getByRole("button", { name: "Show product images" }).click();
  await page.getByTestId("palette-product-MILK").dragTo(page.getByTestId("village-node-B"));
  await expect(page.getByRole("heading", { name: "Edit Milk Supply" })).toBeVisible();
  await expect(page.getByLabel("Unit price")).toHaveValue("20");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: "Markets", exact: true }).click();
  await expect(page.locator("tr").filter({ hasText: "Village B" }).filter({ hasText: "Milk" }).filter({ hasText: "SUPPLY" }).filter({ hasText: "20" })).toBeVisible();
});
