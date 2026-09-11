# Codex Project Status

## Last Updated

- Date: 2026-09-11
- Commit: This commit (`Complete final release verification`)
- Branch: main

## Current Phase

- Phase: Non-optimizer milestone release-ready
- Current Task: Final release verification
- Task Status: `completed`

## Repository Status

- Working Tree: Clean after this commit.
- Latest Commit: This commit (`Complete final release verification`)
- Notes: Fresh build, Vitest, lint, Playwright, Worker smoke, source-boundary, repository-hygiene, and manual responsive checks passed; no release blocker remains.

## Verification

### Build

- Command: `npm run build`
- Status: `PASS`
- Date: 2026-09-11
- Error Summary: None
- Details: Production build completed without the prior chunk-size warning after page-level lazy loading.

### Test

- Command: `npm run test`
- Status: `PASS`
- Date: 2026-09-11
- Tests: 19 test files passed; 82 tests passed.
- Error Summary: None
- Details: 19 Vitest files and 82 tests completed successfully.

### Lint

- Command: `npm run lint`
- Status: `PASS`
- Date: 2026-09-11
- Error Summary: None
- Details: ESLint completed successfully.

### E2E

- Command: `npm run e2e`
- Status: `PASS`
- Date: 2026-09-11
- Details: 8 Playwright tests passed using isolated temporary SQLite and backup paths.

### Optimizer Worker Smoke

- Command: standalone Node process using `tests/e2e/register-tsx.mjs`, demo WorldData, and `runOptimizerInWorker`
- Status: `PASS`
- Date: 2026-09-11
- Details: Worker returned 128 realized profit, 4 plan steps, and 276 expanded states, then terminated cleanly without importing database code in the Worker.

## Changes In Last Task

- Files changed: README, Route Management responsive presentation, mobile E2E regression coverage, and this status note.
- What changed: Replaced the obsolete Vite template README with accurate local setup/verification instructions and converted Route rows to a labeled mobile layout after final responsive verification reproduced page-level overflow at 390 px.
- Why: Close two verified release issues: misleading startup documentation and narrow-screen Route overflow.
- Behavior affected: Documentation and Route presentation only; route CRUD/domain behavior and persistence contracts are unchanged.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. Low
   - Location: `src/client/features/world/route-edge-layout.ts`
   - Problem: Edge routing intentionally uses local smart handles and reverse-pair curves rather than global crossing or label-collision optimization.
   - Impact: Very dense worlds can still have intersections between unrelated routes, although direction pairs and their labels remain separated.
   - Recommended action: Reposition villages manually; consider a bounded fan-out enhancement only if dense-world usage proves it necessary.

## Completed Milestones

- Shared TypeScript types and Zod schemas for world data.
- Domain helpers for products, crates, inventory, routes, and markets.
- Simulation state, reset timing, inventory operations, and buy/sell systems.
- SQLite migrations, transactional demo-world import, repositories, and world API.
- World editor shell, product CRUD/image upload, market management, and village-management work.
- TypeScript village-position contract build blocker fixed in commit `49a3981`.
- Foundation hardening: ESM world route import, Village visual persistence, configurable WorldData persistence, partial-sale accounting, reset validation, isolated test SQLite, and lint fixes.
- Initial inventory uses explicit per-unit cost and is covered through persistence, simulation initialization, partial/full sales, multiple products, and zero-cost inventory tests.
- World and Village routes are covered through isolated HTTP regression tests using `createApp()` and an ephemeral local listener.
- Route Management supports repository/API/client CRUD with shared validation and HTTP/contract regression coverage.
- Simulation UI uses a thin controller/Zustand layer over the existing engine, including reverse-route fallback and travel-driven resets.
- Full WorldData export/import and local JSON backup creation are available through the server and Database & Settings page.
- World/player/simulation/optimization settings and initial inventory are editable and persist through the existing transactional importer.
- Playwright E2E covers app navigation, Simulation initialization, buy/travel/sell UI flow, and rejected-import persistence safety.
- Deterministic simulation scenarios cover money, crates, inventory cost basis, realized profit, resets across travel, and all reverse-route cases.
- Non-optimizer UX/release cleanup is complete, including consistent navigation/copy, recoverable page errors, lazy route chunks, and a manual smoke checklist.
- Optimizer core searches bounded simulation-backed buy/sell/travel plans with deterministic state signatures, beam retention, per-run caching, and search statistics.
- Optimizer Worker/API integration runs one isolated search worker per request with bounded overrides, timeout cleanup, and authoritative repository WorldData.
- Optimizer UI runs the Worker-backed API with validated limits and presents named plan actions, final runtime state, and search statistics.
- Optimizer hardening verifies plan replay, deterministic ordering, material state signatures, multi-product crate use, reset-sensitive travel, initial inventory cost basis, cyclic termination, and bounded search statistics.
- A centralized dark-blue token system, desktop sidebar, accessible mobile drawer, consistent controls/data surfaces, and responsive layouts cover all implemented pages.
- World Editor supports directional route connection/edit dialogs and product-palette drag/drop market creation/editing with immediate persisted refresh.
- Products support optional Supply/Demand price defaults through schema, SQLite migration `004_product_base_prices.sql`, CRUD, import/export, seed, and UI; the Product Palette supports searchable draggable Images/Details grids.
- World routes use a custom flow-coordinate edge with deterministic pairing, smart top/right/bottom/left attachments, reverse-pair curve separation, compact duration labels, arrowheads, and stable selected geometry.

## Remaining Work

None for the current milestone.

## Important Notes For ChatGPT

- Initial inventory entries require `{ productId, quantity, unitCost }`; runtime `inventoryCost` is initialized as `quantity * unitCost` per product.
- Migration `003_initial_inventory_unit_cost.sql` preserves existing databases and explicitly maps legacy rows without recorded cost to `unitCost = 0`.
- `createApp()` owns Express/database setup; `server.ts` owns only port selection and listening.
- Route validation rejects self-routes and zero travel duration; reverse-route fallback remains exclusively in domain/simulation code.
- Simulation UI initializes from persisted WorldData, but all runtime mutations remain in memory and restart from the saved world on reload/restart.
- Simulation actions call `SimulationEngine` through `SimulationController`; React does not advance time, reset villages, or mutate trade state directly.
- Export and backup serialize persisted WorldData only; runtime Simulation state is excluded.
- Import is validated with the shared Zod schema before the existing SQLite transaction runs; schema and database failures leave the prior world unchanged.
- Tests pass explicit temporary directories to backup creation and do not touch the real `backups/` directory or runtime SQLite database.
- `npm run test` excludes `tests/e2e/**`; `npm run e2e` owns Playwright execution and its automatic isolated web servers.
- E2E backend startup creates a temporary SQLite database and backup directory, seeds the demo world deterministically, and cleans them on shutdown.
- World Editor continues to load persisted villages, positions, routes, markets, and products; position saves refresh the persisted aggregate and expose save failures inline.
- Page-level lazy loading reduced the largest generated JavaScript chunk to approximately 233 kB in the latest build.
- Optimizer transitions instantiate the existing `SimulationEngine` from each candidate state; cash, capacity, market, reserve, reset, travel, reverse-route, and profit rules are not duplicated.
- Optimizer state signatures include time/location, player money, sorted inventory and cost basis, every village timer/reserve, all runtime market quantities, and accumulated realized profit.
- Frontier ranking uses unrealized liquidation potential only as a tie-break heuristic; result profit remains `SimulationState.accumulatedProfit`, and exact global optimality is not claimed.
- `POST /api/optimizer/run` accepts only `periodDays`, `beamWidth`, `maxSteps`, and `maxExpandedStates`; persisted settings provide omitted defaults and all effective values are checked against explicit API maxima.
- The Worker never imports database code; the server loads WorldData before spawning it, and each run owns its search state/cache.
- Worker bootstrap prefers a compiled `.js` entry and falls back to the repository's current TypeScript/ESM runtime; a post-build standalone worker smoke returned a profitable result.
- Optimizer UI loads persisted optimization/player/world settings from the existing world endpoint and never sends WorldData to the optimizer API.
- Optimizer plan prices and travel durations are presentation details resolved from persisted markets/routes; profit and final runtime state come directly from `OptimizerResult`.
- Production optimization remains bounded beam search: accumulated realized profit is primary, unsold inventory is not realized profit, continuous mode is tie-break only, and exact global optimality is not guaranteed.
- Identical valid WorldData/options produce the same plan and material final state; only `statistics.elapsedMs` is wall-clock dependent.
- Search limits (`periodDays`, `beamWidth`, `maxSteps`, and `maxExpandedStates`) bound runtime/state growth; the cache remains isolated per run/Worker.
- A deliberately tiny exhaustive helper exists only in optimizer tests to compare maximum realized profit on safely bounded worlds; it is not exported to production.
- Route logical uniqueness is `from + to`; reverse routes remain separate. Market logical uniqueness is `villageId + productId + side`, so Supply and Demand may coexist.
- Canvas route/market mutations call existing client APIs and reload authoritative WorldData only after server success; cancel never persists temporary interaction state.
- Product palette filtering is local, drag payloads use `application/x-village-trade-product`, and only village nodes accept them.
- Product palette mode is stored only in `localStorage` under `village-trade-product-palette-mode`; invalid values fall back to Images mode, and both modes use the same product-ID drag payload.
- Product base-price precedence in Market Assignment is persisted same-side Market price, then matching Product base price, then an empty required price field; Supply and Demand drafts remain independent while the dialog is open.
- Migration `004_product_base_prices.sql` adds nullable `base_supply_price` and `base_demand_price` columns without rebuilding or reseeding existing databases.
- Route edge layout canonicalizes unordered village pairs and is independent of route array order; curve/label geometry is never persisted.
- Village nodes expose subtle fanned source/target handles on four sides; attachment sides recompute from current node positions while dragging, and persistence still occurs only through the existing position workflow.
- Manual browser review covered World, Products, Villages, Routes, Markets, Simulation, Optimizer, and Database & Settings at 1440, 1024, 768, and 390 px; navigation, hierarchy, panels, controls, data readability, World canvas/palette integration, and page-level overflow were inspected.
- The World canvas remains an intentionally pannable workspace at narrow widths; management data switches to compact labeled rows where needed instead of forcing page-level horizontal scrolling.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Final architecture review confirmed UI → `POST /api/optimizer/run` → authoritative repository WorldData → isolated Worker → `runOptimizer` → `SimulationEngine` → result; browser code contains no optimizer search and the Worker imports no persistence/database modules.
- Final replay/objective review is covered by freshly passing optimizer tests: material location, money, inventory/cost basis, time, village timers/reserves, market quantities, and realized profit replay; realized profit remains primary, continuous mode is tie-break only, unsold inventory is not realized profit, and no bonus/global-optimum claim exists.
- Final verification: build without chunk warnings, 19 Vitest files/82 tests, lint, 8 Playwright E2E tests, and standalone Worker smoke passed. Automated verification used temporary SQLite/backup paths and did not target runtime data.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-11 | This commit | PASS | PASS | PASS | PASS | Release-ready: 19 Vitest files/82 tests, 8 Playwright tests, Worker smoke, checklist/source review, and responsive inspection passed. |
