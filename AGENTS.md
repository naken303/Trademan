# VillageTradePlanner — Agent Instructions

## Purpose

VillageTradePlanner is a local trading-route planner. It models villages, products, markets, travel, inventory, simulation, and route optimization. Its primary optimization outcome is **maximum accumulated profit** over the configured period.

Read [docs/project-spec.md](docs/project-spec.md) before changing domain, simulation, database, or optimizer code. This file is the short operational guide; the specification is the maintained project context.

## Required workflow

1. Inspect the relevant code, shared types/schemas, tests, and current Git status before editing.
2. Treat `src/shared/types` and `src/shared/schemas` as the contract across client, server, simulation, and persistence. Keep them aligned.
3. Keep UI, API routes, repositories, SQLite, domain rules, and simulation concerns separate.
4. Make the smallest scoped change that satisfies the request. Do not refactor unrelated code or silently alter game rules.
5. For a data or API contract change, update all affected call sites and tests in the same change.
6. Run `npm run build` and `npm run test` after code changes. Report the exact result and any remaining failure.
7. Review the diff before proposing a commit. Do not commit, push, reset, or delete user data unless explicitly asked.

## Domain rules that must not drift

- Time advances only while travelling; buying and selling do not advance time.
- Village supply/demand quantities and village reserve money reset together for all villages.
- A village's first reset uses `reset.current`; every subsequent reset uses `reset.afterReset`.
- Routes are directional when explicitly defined. If a reverse route is absent, travel in reverse uses the outbound route's travel time. An explicit reverse route overrides that fallback.
- A crate cannot mix product types. Crates required per product are `ceil(quantity / unitsPerCrate)`; total inventory crates are the sum across products.
- A buy transfers money from player to village and reduces supply. A sell transfers money from village to player and reduces demand. A sale is allowed only if the village has sufficient reserve money.
- The optimizer maximizes accumulated profit. Continuous selling is a preference/tie-breaker, not the primary objective.
- Bonus calculation is intentionally out of scope.

## Data and persistence rules

- Validate external JSON/API data with Zod; do not use casts to hide schema mismatches.
- Store product images as filesystem assets. SQLite stores only their relative paths; never store image binary/base64 in SQLite.
- The runtime SQLite database is generated state. Migrations and seed JSON are source-controlled; the runtime database is not.
- Do not make server startup re-import the demo world automatically: user edits must survive restarts.
- Database access belongs in repositories, not Express routes or React components.
- Client code calls API modules/stores, never SQLite directly.

## Current caution

The prior working session ended with a TypeScript contract mismatch around `updateVillagePosition`. The intended signature everywhere is:

```ts
updateVillagePosition(villageId: string, position: Position)
```

Verify the repository's actual state before changing it. Do not assume that prior pasted code was applied successfully.

## Expected verification commands

```powershell
npm run build
npm run test
```

Use the scripts defined in the repository's `package.json` as authoritative if these names differ.
