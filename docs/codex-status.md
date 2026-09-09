# Codex Project Status

## Last Updated

- Date: 2026-09-09
- Commit: eef812a
- Branch: main

## Current Phase

- Phase: Foundation hardening
- Current Task: Initial inventory cost basis and HTTP API regression coverage
- Task Status: `completed`

## Repository Status

- Working Tree: Pending initial-inventory/API-test commit
- Latest Commit: `eef812a Update Codex status after foundation hardening`
- Notes: This status note is included with the pending implementation commit.

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
- Tests: 11 test files passed; 28 tests passed.
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

- Files changed: Shared inventory/player contracts and schema; simulation initialization; database migration/import/repository; Express app setup; initial-inventory, persistence, and HTTP tests; this status note.
- What changed: Added required `unitCost` to initial inventory, persisted it, initialized total product cost basis, extracted `createApp()`, and added World/Village HTTP regression coverage.
- Why: Complete foundation accounting and verify current API routes through actual HTTP requests.
- Behavior affected: Selling initial inventory now realizes profit from explicit weighted cost; API setup is independently testable without starting the production listener.

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

## Remaining Work

1. Implement Route Management.
2. Implement Simulation UI.
3. Implement import/export/backup and remaining editor/settings integration.
4. Add E2E and full scenario coverage.
5. Complete UX and release cleanup.
6. Implement optimizer work later.

## Important Notes For ChatGPT

- Initial inventory entries require `{ productId, quantity, unitCost }`; runtime `inventoryCost` is initialized as `quantity * unitCost` per product.
- Migration `003_initial_inventory_unit_cost.sql` preserves existing databases and explicitly maps legacy rows without recorded cost to `unitCost = 0`.
- `createApp()` owns Express/database setup; `server.ts` owns only port selection and listening.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification: build, 28 tests, and lint pass; E2E was not run because no E2E npm script exists.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-09 | `49a3981` | PASS | PASS | FAIL | NOT_RUN | Build completed with a non-failing chunk-size warning; 7 test files/18 tests passed; lint reported seven errors. |
| 2026-09-09 | `2bc38c2` | PASS | PASS | PASS | NOT_RUN | 9 test files/23 tests passed; E2E script is not defined. |
| 2026-09-09 | pending initial-inventory/API-test commit | PASS | PASS | PASS | NOT_RUN | 11 test files/28 tests passed; E2E script is not defined. |
