# Codex Project Status

## Last Updated

- Date: 2026-09-09
- Commit: 655bb4a
- Branch: main

## Current Phase

- Phase: Foundation hardening
- Current Task: Fix ESM, persistence, simulation accounting, reset validation, test isolation, and lint
- Task Status: `completed`

## Repository Status

- Working Tree: Pending foundation-hardening commit
- Latest Commit: `655bb4a Add Codex project status note`
- Notes: This status note is updated in the same pending change as the foundation fixes.

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
- Tests: 9 test files passed; 23 tests passed.
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

- Files changed: Server persistence/API, simulation validation/accounting, affected client form lifecycle handling, tests, migration, and this status note.
- What changed: Replaced ESM-incompatible `require`, persisted Village visual and configurable WorldData fields, fixed partial-sale cost tracking, rejected zero reset durations, isolated Vitest SQLite state, and removed synchronous effect state updates.
- Why: Make the existing foundation reliable before route management or optimizer work.
- Behavior affected: World import/reload preserves configurable data; village visuals round-trip; partial sales retain correct cost basis; malformed reset durations are rejected; lint passes.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. High
   - Location: `src/simulation/simulation-state.ts`
   - Problem: Initial inventory has no explicit cost-basis field in the shared WorldData contract.
   - Impact: A simulation that sells initial inventory cannot derive realized profit without assuming a zero cost basis.
   - Recommended action: Define an explicit initial-inventory cost-basis contract before enabling trading from initial inventory.

3. Medium
   - Location: `src/server/routes/`, `tests/server/`
   - Problem: Server persistence behavior is covered, but HTTP-level GET/POST/PUT route regression tests are not present.
   - Impact: Route wiring and response behavior have less automated coverage than repository behavior.
   - Recommended action: Add isolated HTTP API tests when an app test harness is introduced.

4. Low
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

## Remaining Work

1. Define and implement initial-inventory cost basis before simulation trading UI or optimizer work.
2. Add HTTP API regression coverage for World and Village routes.
3. Implement Route Management UI and route CRUD layers.
4. Implement Simulation UI for runtime state, travel, trading, inventory, and reset display.
5. Implement optimizer search, worker execution, result UI, validation, performance work, and full scenario tests.

## Important Notes For ChatGPT

- The pending foundation-hardening change adds migration `002_world_settings.sql`; existing databases are upgraded through the migration runner.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Latest verification: build, test, and lint pass; E2E was not run because no E2E npm script exists.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-09 | `49a3981` | PASS | PASS | FAIL | NOT_RUN | Build completed with a non-failing chunk-size warning; 7 test files/18 tests passed; lint reported seven errors. |
| 2026-09-09 | pending foundation-hardening commit | PASS | PASS | PASS | NOT_RUN | 9 test files/23 tests passed; E2E script is not defined. |
