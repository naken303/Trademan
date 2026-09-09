# Codex Project Status

## Last Updated

- Date: 2026-09-10
- Commit: This commit (`Add optimizer UI`)
- Branch: main

## Current Phase

- Phase: Optimizer implementation
- Current Task: Optimizer UI integration
- Task Status: `completed`

## Repository Status

- Working Tree: Clean after this commit.
- Latest Commit: This commit (`Add optimizer UI`)
- Notes: Optimizer runs through the existing Worker-backed HTTP API and results are presented without client-side search logic.

## Verification

### Build

- Command: `npm run build`
- Status: `PASS`
- Date: 2026-09-10
- Error Summary: None
- Details: Production build completed without the prior chunk-size warning after page-level lazy loading.

### Test

- Command: `npm run test`
- Status: `PASS`
- Date: 2026-09-10
- Tests: 17 test files passed; 55 tests passed.
- Error Summary: None
- Details: Vitest completed successfully.

### Lint

- Command: `npm run lint`
- Status: `PASS`
- Date: 2026-09-10
- Error Summary: None
- Details: ESLint completed successfully.

### E2E

- Command: `npm run e2e`
- Status: `PASS`
- Date: 2026-09-10
- Details: 4 Playwright tests passed using isolated temporary SQLite and backup paths.

## Changes In Last Task

- Files changed: Optimizer API client/page/styles; client router and navigation; Playwright core scenario; this status note.
- What changed: Added a lazy Optimizer page with bounded run controls, recoverable request states, readable plan and final-state output, and search statistics.
- Why: Make the existing Worker-backed optimizer usable from the application without duplicating search or simulation behavior in React.
- Behavior affected: Users can run optimizer searches against persisted WorldData and inspect realized profit, chronological actions, final inventory/capacity, timing, and search statistics.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. Low
   - Location: N/A
   - Problem: No low-priority release issue has been verified.
   - Impact: N/A
   - Recommended action: Continue with optimizer quality and performance hardening as a separate bounded task.

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

## Remaining Work

1. Optimizer quality and performance hardening.

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
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification: build without chunk warnings, 55 Vitest tests, lint, and 4 Playwright E2E tests passed.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-10 | This commit | PASS | PASS | PASS | PASS | 17 Vitest files/55 tests and 4 Playwright tests passed; optimizer UI E2E found buy/travel/sell actions and positive realized profit. |
