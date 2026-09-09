# Codex Project Status

## Last Updated

- Date: 2026-09-09
- Commit: This commit (`Implement world import export backup and settings`)
- Branch: main

## Current Phase

- Phase: Feature implementation
- Current Task: World import/export/backup and settings integration
- Task Status: `completed`

## Repository Status

- Working Tree: Clean after this commit.
- Latest Commit: This commit (`Implement world import export backup and settings`)
- Notes: Valid imports replace persisted WorldData transactionally; backups are JSON snapshots under local `backups/`.

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
- Tests: 14 test files passed; 40 tests passed.
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

- Files changed: World file service/API; Database & Settings page/styles/navigation; focused persistence and HTTP tests; this status note.
- What changed: Added full WorldData JSON export/import, manual JSON backups, and editing for persisted world/player/simulation/optimization settings and initial inventory.
- Why: Complete the bounded world configuration and database-management workflow.
- Behavior affected: Users can export, transactionally import after confirmation, create local backups, and save all settings already present in the shared WorldData contract.

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
- Full WorldData export/import and local JSON backup creation are available through the server and Database & Settings page.
- World/player/simulation/optimization settings and initial inventory are editable and persist through the existing transactional importer.

## Remaining Work

1. Add E2E and full scenario coverage.
2. Complete UX and release cleanup.
3. Implement optimizer work later.

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
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification: build, 40 tests, and lint pass; E2E was not run because no E2E npm script exists.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-09 | This commit | PASS | PASS | PASS | NOT_RUN | 14 test files/40 tests passed; build has a non-failing chunk-size warning; E2E script is not defined. |
