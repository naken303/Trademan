# Codex Project Status

## Last Updated

- Date: 2026-09-09
- Commit: This commit (`Implement simulation UI`)
- Branch: main

## Current Phase

- Phase: Feature implementation
- Current Task: Simulation UI
- Task Status: `completed`

## Repository Status

- Working Tree: Clean after this commit.
- Latest Commit: This commit (`Implement simulation UI`)
- Notes: Runtime simulation mutations remain session-only and are not written back to WorldData persistence.

## Verification

### Build

- Command: `npm run build`
- Status: `PASS`
- Date: 2026-09-09
- Error Summary: None
- Details: Production build completed; Vite reported a non-failing warning that one generated JavaScript chunk is larger than 500 kB after minification.

### Test

- Command: `npm run test`
- Status: `PASS`
- Date: 2026-09-09
- Tests: 13 test files passed; 34 tests passed.
- Error Summary: None
- Details: Vitest completed successfully.

### Lint

- Command: `npm run lint`
- Status: `PASS`
- Date: 2026-09-09
- Error Summary: None
- Details: ESLint completed successfully.

### E2E

- Command: N/A (no E2E script is defined in `package.json`)
- Status: `NOT_RUN`
- Date: 2026-09-09
- Details: Playwright is installed but no project E2E command was available to run.

## Changes In Last Task

- Files changed: Simulation controller/store; Simulator page/styles; focused controller integration tests; this status note.
- What changed: Added a runtime Simulation UI for state, travel, inventory, village markets, buying, selling, reset timing, crate use, and accumulated profit.
- Why: Deliver the first complete interactive UI over the existing simulation engine.
- Behavior affected: Users can initialize from saved WorldData and run session-only buy, travel, and sell actions with immediate state refresh.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. Low
   - Location: Vite production output
   - Problem: One generated JavaScript chunk exceeds 500 kB after minification.
   - Impact: Build passes, but first-load performance can be affected.
   - Recommended action: Consider code splitting when feature work makes it worthwhile.

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

## Remaining Work

1. Implement import/export/backup and remaining editor/settings integration.
2. Add E2E and full scenario coverage.
3. Complete UX and release cleanup.
4. Implement optimizer work later.

## Important Notes For ChatGPT

- Initial inventory entries require `{ productId, quantity, unitCost }`; runtime `inventoryCost` is initialized as `quantity * unitCost` per product.
- Migration `003_initial_inventory_unit_cost.sql` preserves existing databases and explicitly maps legacy rows without recorded cost to `unitCost = 0`.
- `createApp()` owns Express/database setup; `server.ts` owns only port selection and listening.
- Route validation rejects self-routes and zero travel duration; reverse-route fallback remains exclusively in domain/simulation code.
- Simulation UI initializes from persisted WorldData, but all runtime mutations remain in memory and restart from the saved world on reload/restart.
- Simulation actions call `SimulationEngine` through `SimulationController`; React does not advance time, reset villages, or mutate trade state directly.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification: build, 34 tests, and lint pass; E2E was not run because no E2E npm script exists.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-09 | This commit | PASS | PASS | PASS | NOT_RUN | 13 test files/34 tests passed; build has a non-failing chunk-size warning; E2E script is not defined. |
