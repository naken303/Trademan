# VillageTradePlanner Project Specification

## Status and scope

This document records the agreed context from the design and implementation conversation. It is a project guide, not a replacement for the repository: when code, migrations, tests, or `package.json` differ from this document, identify the mismatch before changing behavior.

The product is a local trading-route planner with three application areas:

- **World** — edit villages, routes, and markets on a map.
- **Products** — manage products and their images.
- **Simulation & Optimizer** — simulate travel/trading and find a plan with the best accumulated profit.

## Technology and boundaries

| Layer | Agreed technology / responsibility |
| --- | --- |
| Client | React, TypeScript, Vite, React Router, Zustand |
| World map | `@xyflow/react` (React Flow) |
| Server | Express, TypeScript |
| Persistence | SQLite via `better-sqlite3`; migrations + repository layer |
| Validation | Zod shared at data boundaries |
| Tests | Vitest |
| Optimizer execution | Worker thread (planned) |

System flow:

```text
React UI → Zustand store → client API → Express route → repository → SQLite
                                      ↘ Zod validation ↗

Shared types/schemas → domain rules → simulation engine → optimizer
```

UI and simulation must not query SQLite directly. Routes must not embed database queries.

## World definition and core model

`WorldData` is the aggregate definition. It contains:

- `schemaVersion`
- `settings.currency`
- player settings: starting village, money, crate capacity, continuous mode, and initial inventory
- simulation start day/hour
- optimizer settings: period days, beam width, maximum steps
- products, villages, routes, and markets

Core records:

- **Product**: id, name, optional category, `unitsPerCrate`, optional file image.
- **Village**: id, name, map position, optional visual metadata, initial reserve money, and reset timer.
- **Route**: id, `from`, `to`, travel duration.
- **Market**: id, village id, product id, side (`supply` or `demand`), unit price, initial quantity.

Product IDs are case-sensitive. The sample world uses `MILK`, `EGG`, `VEG`, and `NAIL`.

## Business and simulation rules

### Time and village resets

- Time passes only on travel.
- Market operations do not consume time.
- All villages reset simultaneously.
- A village's initial countdown is `reset.current`.
- Once reset, subsequent countdowns use `reset.afterReset`.
- Reset restores the village reserve money and relevant supply/demand quantities to their configured initial values.

### Travel

- A stored route is directional.
- Prefer the direct route for `from → to`.
- If it is absent, use the reverse route's travel time as a fallback.
- If both directions are explicitly present, each uses its own duration.

### Inventory and crates

- Inventory is tracked per product and quantity.
- `crates(product, quantity) = ceil(quantity / product.unitsPerCrate)`.
- Total used crates is the sum of that calculation for each product type.
- Different product types never share a crate, including partially filled crates.
- Purchases must not exceed the player's crate capacity.

### Trading

Buying from a supply market requires a positive integer quantity, available supply, player money, known product, and inventory capacity. It decreases player money and supply quantity; it increases village reserve money and player inventory.

Selling to a demand market requires a positive integer quantity, player inventory, available demand, and enough village reserve money. It decreases inventory, demand quantity, and village reserve money; it increases player money.

The recorded design uses purchase cost to track inventory cost. Accumulated profit is the realized gain from selling, not merely sale revenue. Preserve or complete this accounting consistently rather than changing the objective implicitly.

### Optimization

- Primary objective: maximize accumulated profit within the configured period.
- Continuous selling is a preference/tie-breaker only.
- Planned controls include `periodDays`, `beamWidth`, and `maxSteps`.
- Bonus calculation is explicitly not implemented and must not be assumed in score calculations.

## Persistence and assets

SQLite tables cover villages, products, routes, markets, player settings, and optimization settings. Foreign keys are enabled; routes and markets reference villages/products.

- SQL migrations live in `database/migrations/`.
- The demo world lives in `database/seed/demo-world.json` and is validated before import.
- Import is transactional: a failed import rolls back the whole operation.
- The runtime database (`database/*.sqlite` plus WAL/SHM) is local generated state and should be ignored by Git.
- Product uploads belong under `assets/products/`; SQLite keeps a relative path only. Supported uploads previously included JPEG, PNG, WebP, and GIF, with a 5 MB limit.
- Browser cache-busting may be needed after replacing an image while keeping the same path.

## Expected repository layout

```text
database/
  migrations/
  seed/demo-world.json
src/
  client/
    app/
    components/layout/
    features/world/
    features/products/
    features/simulator/
    styles/
  domain/
    product/
    inventory/
    route/
    market/
  shared/
    types/
    schemas/
  simulation/
    systems/
  server/
    database/
      repositories/
    routes/
tests/
  domain/
  server/
assets/
  products/
```

This is the intended structure. Inspect the actual tree before adding, moving, or replacing files.

## Implementation status captured from the prior session

Implemented or substantially started:

- Shared TypeScript types and Zod schemas for world data.
- Domain helpers for products/crates, inventory, routes, and markets.
- Simulation state, reset timing, inventory operations, and buy/sell systems.
- Demo world JSON plus schema test.
- SQLite connection, migration runner, transactional import, repositories, and world API.
- React application shell, World page, React Flow editor, drag/save/cancel/undo/redo behavior, and dirty-state UI.
- Product CRUD, product image upload, and product management UI.
- Market CRUD/API and market-management work.
- Village CRUD/reset-editor work was initiated.

Still planned or unfinished:

- Route Management UI.
- Completing/validating Village Management UI and reset timer editor.
- World editor validation/polish.
- Simulation UI, runtime/time/reset display, trading UI, and inventory UI.
- Full scenario tests.
- Optimizer search foundation, worker thread, result UI, validation, and performance work.

### Known cautions

- The final reported compiler error was in `src/client/features/world/world-store.ts`: a call supplied three arguments to `updateVillagePosition`; the intended API accepts `(villageId, position)`.
- Village visual fields have previously differed between the SQLite schema and shared schema. Preserve nullable handling (`string | null | undefined`) where the actual database returns `NULL`.
- Do not alter old migrations after use; add a new migration for schema changes.
- Market creation is server-owned for IDs; client create payloads should not be forced to provide a market id. Product IDs, in contrast, are part of the product contract.

## Development workflow

Before editing:

1. Read `package.json`, relevant source files, shared types/schemas, migrations, and tests.
2. Check Git status and preserve unrelated local changes.
3. Confirm whether the implementation matches this specification.

For each change:

1. Keep the change scoped to the requested feature.
2. Update types, Zod schemas, server/client contract, and tests together when a contract changes.
3. Use repository functions for persistence and API/store modules for client access.
4. Do not introduce hard-coded game values where world/player/optimization settings already provide them.
5. Validate seed/API JSON at the boundary; do not paper over data shape errors with type assertions.

After editing:

```powershell
npm run build
npm run test
```

Report changed files, command outcomes, and any unresolved issue. Do not commit or push unless explicitly asked.
