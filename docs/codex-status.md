# Codex Project Status

## Last Updated

- Date: 2026-09-09
- Commit: 49a3981
- Branch: main

## Current Phase

- Phase: Repository status tracking
- Current Task: Create initial machine-readable project status note
- Task Status: `completed`

## Repository Status

- Working Tree: Clean before creating this status note
- Latest Commit: `49a3981 Fix village position update contract`
- Notes: The latest code change corrected the village-position API call contract.

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
- Tests: 7 test files passed; 18 tests passed.
- Error Summary: None
- Details: Vitest completed successfully.

### Lint

- Command: `npm run lint`
- Status: `FAIL`
- Date: 2026-09-09
- Error Summary: Seven errors: six `react-hooks/set-state-in-effect` errors and one `@typescript-eslint/no-require-imports` error.
- Details: The exact affected locations are recorded in Known Issues item 7.

## Changes In Last Task

- Files changed: `src/client/features/world/world-store.ts`
- What changed: Passed the `Position` object to `saveVillagePosition` instead of separate x/y arguments.
- Why: Match the `updateVillagePosition(villageId, position)` contract and remove the TypeScript build blocker.
- Behavior affected: Saving a moved village position can compile and call the documented client API contract.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. High
   - Location: `src/server/routes/world.ts`
   - Problem: The `GET /api/world` handler uses `require()` although the package is configured as an ES module.
   - Impact: The endpoint can fail at runtime when `require` is unavailable in the ESM runtime.
   - Recommended action: Use a static ESM import for the world repository.

3. High
   - Location: `src/server/database/repositories/village-repository.ts`
   - Problem: Village visual fields are present in the migration/importer but are not selected, inserted, or updated by the repository.
   - Impact: `Village.visual` values do not round-trip through persistence.
   - Recommended action: Align repository queries and writes with the shared Village contract, including nullable values.

4. High
   - Location: `src/server/database/repositories/world-repository.ts`
   - Problem: Currency, simulation start values, and initial inventory are returned as fixed values rather than preserved world data.
   - Impact: Imported `WorldData` does not round-trip completely through SQLite.
   - Recommended action: Decide the persistence contract and add a migration plus repository support if these values must be configurable.

5. Medium
   - Location: `src/simulation/systems/trade-system.ts`
   - Problem: `sell()` calculates remaining inventory cost but does not store it in the returned player state.
   - Impact: A later partial sale of the same product can calculate realized profit incorrectly.
   - Recommended action: Persist the updated inventory-cost map and add a partial-sale test.

6. Medium
   - Location: `src/shared/schemas/common.schema.ts`, `src/simulation/systems/reset-system.ts`
   - Problem: A zero-duration reset is valid in the schema; the reset loop has no guard for a zero subsequent duration.
   - Impact: Travel can loop indefinitely for that valid input.
   - Recommended action: Reject zero reset durations or explicitly define and handle their behavior.

7. Medium
   - Location: `src/client/features/market/MarketForm.tsx`, `src/client/features/market/MarketPage.tsx`, `src/client/features/products/ProductForm.tsx`, `src/client/features/world/VillageForm.tsx`, `src/client/features/world/VillagePage.tsx`, `src/server/routes/world.ts`
   - Problem: The current lint command reports seven errors: six synchronous state updates in effects and one forbidden `require()` import.
   - Impact: `npm run lint` does not pass.
   - Recommended action: Address the lint findings in scoped follow-up work.

## Completed Milestones

- Shared TypeScript types and Zod schemas for world data.
- Domain helpers for products, crates, inventory, routes, and markets.
- Simulation state, reset timing, inventory operations, and buy/sell systems.
- SQLite migrations, transactional demo-world import, repositories, and world API.
- World editor shell, product CRUD/image upload, market management, and village-management work.
- TypeScript village-position contract build blocker fixed in commit `49a3981`.

## Remaining Work

1. Resolve the verified server, persistence, simulation-accounting, and lint issues above with matching tests.
2. Implement Route Management UI and route CRUD layers.
3. Implement Simulation UI for runtime state, travel, trading, inventory, and reset display.
4. Implement optimizer search, worker execution, result UI, validation, performance work, and full scenario tests.

## Important Notes For ChatGPT

- The latest verified code commit before this status-note change is `49a3981`; it fixed the TypeScript village-position call mismatch.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification for this status-note update: build and test passed; lint failed with seven errors.

## Verification History

| Date | Commit | Build | Test | Lint | Notes |
| ---- | ------ | ----- | ---- | ---- | ----- |
| 2026-09-09 | `49a3981` | PASS | PASS | FAIL | Build completed with a non-failing chunk-size warning; 7 test files/18 tests passed; lint reported seven errors. |
