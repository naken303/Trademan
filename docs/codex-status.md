# Codex Project Status

## Last Updated

- Date: 2026-09-14
- Commit: task commit at repository `HEAD`
- Branch: main

## Current Phase

- Phase: Configurable optimizer search strategies complete
- Current Task: Add per-run Baseline, Balanced, Optimized, and Custom search strategies
- Task Status: `completed`

## Repository Status

- Working Tree: This note describes the task commit at repository HEAD; checkout-local state must be confirmed with Git status.
- Latest Commit: Optional optimizer strategy task commit at repository HEAD.
- Notes: Search strategy is a per-run API/Worker snapshot and does not modify persisted WorldData. Baseline disables all optional guidance, Balanced enables the five lower-risk strategies, Optimized enables all seven, and Custom exposes each flag independently.
  The Optimizer page restores its running state from an active job after reload and keeps Brake visible after start.
  Returned plans compact consecutive same-village Buy/Sell actions for the same product without changing the simulated final state.
  Target mode ignores period/steps/expanded-state stopping conditions, retains Beam Width as the active memory bound, and relies on target completion, frontier exhaustion, or Brake to finish.
  When a normal run ends at maxSteps or a target run reaches its target, a liquidation phase adds legal Travel/Sell steps without consuming the search step budget.

## Verification

### Build

- Command: `npm run build`
- Status: `PASS`
- Date: 2026-09-14
- Error Summary: None
- Details: Production build completed successfully with optional optimizer strategy contracts and UI.

### Test

- Command: `npm run test`
- Status: `PASS`
- Date: 2026-09-14
- Tests: 23 test files passed; 114 tests passed.
- Error Summary: None
- Details: Full Vitest suite completed successfully, including preset/custom resolution, crate candidates, pruning switches, reset safety, replay, Brake/target behavior, Worker/API validation, and the three-preset benchmark.

### Lint

- Command: `npm run lint`
- Status: `PASS`
- Date: 2026-09-14
- Error Summary: None
- Details: ESLint completed successfully after the strategy UI and optimizer changes.

### E2E

- Command: `npm run e2e`
- Status: `PASS`
- Date: 2026-09-14
- Details: All 4 Playwright flows passed using isolated temporary SQLite and backup paths.

### Optimizer Worker Smoke

- Command: `npm run test -- --run tests/optimizer/optimizer-worker-api.test.ts` (included in the focused 21-test run and the full suite)
- Status: `PASS`
- Date: 2026-09-14
- Details: Worker/API integration passed with guided candidate generation, cooperative Brake, and the disk-backed state store.

## Changes In Last Task

- Files changed: Optimizer strategy/types, candidate generation, scoring/search integration, Worker/API boundary, Optimizer UI/styles, focused optimizer/API tests, benchmark, and this status note.
- What changed: Added centralized immutable strategy presets and raw flags; Baseline legacy candidates/scoring; optional crate, BUY, SELL, travel and scoring guidance; resolved result metadata; candidate counters; strict API validation; and per-run UI controls.
- Why: Allow direct A/B comparison and selective tuning without changing WorldData or business rules.
- Behavior affected: Balanced is the default. Final result ranking remains realized-profit-first and all transitions remain SimulationEngine-authoritative. Existing saved UI output without strategy/candidate metadata remains renderable.

## Known Issues

1. Critical
   - Location: N/A
   - Problem: No critical issue has been verified.
   - Impact: N/A
   - Recommended action: Continue to verify after each scoped change.

2. Medium
   - Location: Optimizer Target mode
   - Problem: An unreachable profit target can search indefinitely by design.
   - Impact: The user must use Brake when no target result is found.
   - Recommended action: Set realistic targets and monitor progress/Brake.

3. Low
   - Location: World canvas route layout
   - Problem: Edge routing intentionally uses local smart handles rather than global crossing or label-collision optimization.
   - Impact: Very dense worlds can still have intersections between unrelated route pairs.
   - Recommended action: Reposition villages manually; consider a bounded fan-out enhancement only if dense-world usage proves it necessary.

4. Low
   - Location: Optimizer post-plan liquidation
   - Problem: Inventory cannot always be fully sold when reachable demand, reserve money, or remaining normal-mode time is insufficient.
   - Impact: The final plan can retain unsellable inventory.
   - Recommended action: Increase the period, use Target mode, or adjust market demand/reserves.

5. Low
   - Location: Balanced optimizer preset benchmark
   - Problem: On the current 22/31/46 synthetic fixture, Balanced generated 1,574 states versus Baseline 1,458 and ran 3.3% slower because legacy SELL candidates remain enabled by design.
   - Impact: Balanced is safer than Optimized but is not faster on every world shape.
   - Recommended action: Compare presets on production WorldData and use Optimized when its stronger SELL reduction is acceptable.

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
- World routes use one custom bidirectional edge per village pair with smart top/right/bottom/left attachments, compact duration labels, arrowheads at both ends, and stable selected geometry.
- Simulation and Optimizer share a responsive Village Current Reset card/grid with per-card validation and accessible Village-specific input labels.
- Product Management provides a controlled Military/Domestic/Industrial/Neutral category dropdown while preserving existing legacy category strings during edit.
- Optimizer runtime timeout is configurable per run from 1–600 seconds through the UI/API while retaining a 30-second default.
- Optimizer candidate retention is bounded to eight times beam width per depth, and cache entries are retained only for the selected frontier to prevent unbounded Worker heap growth.
- Guided beam search precomputes sparse market indexes, route-aware shortest paths, commercial transit nodes, and profitable trade opportunities once per run.
- Strategic candidate generation prunes unreachable/unprofitable BUY branches and unrelated travel while retaining conservative travel fallback, multi-hop next hops, and SimulationEngine authority.

## Remaining Work

1. Validate Baseline/Balanced/Optimized against the user's production WorldData and choose a preferred preset for that world.
2. Continue release packaging and real-world optimizer stress validation.

## Important Notes For ChatGPT

- Initial inventory entries require `{ productId, quantity, unitCost }`; runtime `inventoryCost` is initialized as `quantity * unitCost` per product.
- Migration `003_initial_inventory_unit_cost.sql` preserves existing databases and explicitly maps legacy rows without recorded cost to `unitCost = 0`.
- `createApp()` owns Express/database setup; `server.ts` owns only port selection and listening.
- Route validation rejects self-routes and zero travel duration. Reverse-route fallback remains exclusively in domain/simulation code, except routes explicitly saved with `returnAvailable: false` are one-way.
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
- Frontier ranking uses realized profit plus travel-discounted reachable inventory and one-crate continuation potential so promising stockpiles can survive narrow beams. Final result ranking remains realized-profit-first, and exact global optimality is not claimed.
- Reachable inventory potential greedily caps value by runtime/reset-aware Demand quantity and village reserve, allocates across multiple reachable Demand villages, and never becomes realized profit.
- BUY quantities are limited to maximum feasible, Demand/reserve matched, combined-Demand, crate-boundary, and bounded capacity-reservation candidates; generic one-third/half/two-thirds branching was removed.
- Travel candidates use deterministic next hops toward held-inventory Demand and profitable Supply opportunities; a conservative adjacent-route fallback is used only when strategic generation yields no action.
- `POST /api/optimizer/run` accepts bounded search options plus the shared run-specific village reset map; the server loads authoritative WorldData and does not persist the reset overrides.
- The Worker never imports database code; the server loads WorldData before spawning it, and each run owns its search state/cache.
- Worker bootstrap prefers a compiled `.js` entry and falls back to the repository's current TypeScript/ESM runtime; a post-build standalone worker smoke returned a profitable result.
- Optimizer UI loads persisted optimization/player/world settings from the existing world endpoint and never sends WorldData to the optimizer API.
- Optimizer plan prices and travel durations are presentation details resolved from persisted markets/routes; profit and final runtime state come directly from `OptimizerResult`.
- Production optimization remains bounded beam search: accumulated realized profit is primary, unsold inventory is not realized profit, continuous mode is tie-break only, and exact global optimality is not guaranteed.
- Identical valid WorldData/options produce the same plan and material final state; only `statistics.elapsedMs` is wall-clock dependent.
- Search limits (`periodDays`, `beamWidth`, `maxSteps`, and `maxExpandedStates`) bound runtime/state growth; the cache remains isolated per run/Worker.
- Runtime timeout is a non-persisted per-run API option (`timeoutSeconds`, 1–600); the server converts it to the Worker runner's millisecond limit, and omission preserves the 30-second default.
- A deliberately tiny exhaustive helper exists only in optimizer tests to compare maximum realized profit on safely bounded worlds; it is not exported to production.
- Route logical uniqueness is an unordered village pair; one record contains the forward duration and optional return duration. Market logical uniqueness is `villageId + productId + side`, so Supply and Demand may coexist.
- Canvas route/market mutations call existing client APIs and reload authoritative WorldData only after server success; cancel never persists temporary interaction state.
- Product palette filtering is local, drag payloads use `application/x-village-trade-product`, and only village nodes accept them.
- Product palette mode is stored only in `localStorage` under `village-trade-product-palette-mode`; invalid values fall back to Images mode, and both modes use the same product-ID drag payload.
- Product base-price precedence in Market Assignment is persisted same-side Market price, then matching Product base price, then an empty required price field; Supply and Demand drafts remain independent while the dialog is open.
- Migration `004_product_base_prices.sql` adds nullable `base_supply_price` and `base_demand_price` columns without rebuilding or reseeding existing databases.
- Route edge layout renders one direct bidirectional edge per persisted pair; handle and label geometry is never persisted.
- Village nodes expose subtle fanned source/target handles on four sides; attachment sides recompute from current node positions while dragging, and persistence still occurs only through the existing position workflow.
- Manual browser review covered World, Products, Villages, Routes, Markets, Simulation, Optimizer, and Database & Settings at 1440, 1024, 768, and 390 px; navigation, hierarchy, panels, controls, data readability, World canvas/palette integration, and page-level overflow were inspected.
- The World canvas remains an intentionally pannable workspace at narrow widths; management data switches to compact labeled rows where needed instead of forcing page-level horizontal scrolling.
- Do not re-import the demo world during server startup; SQLite runtime state must survive restart.
- Shared types and Zod schemas are the contract between client, server, simulation, and persistence.
- The optimizer's primary objective is accumulated profit; continuous selling is only a tie-break preference.
- Final architecture review confirmed UI → `POST /api/optimizer/run` → authoritative repository WorldData → isolated Worker → `runOptimizer` → `SimulationEngine` → result; browser code contains no optimizer search and the Worker imports no persistence/database modules.
- Final replay/objective review is covered by freshly passing optimizer tests: material location, money, inventory/cost basis, time, village timers/reserves, market quantities, and realized profit replay; realized profit remains primary, continuous mode is tie-break only, unsold inventory is not realized profit, and no bonus/global-optimum claim exists.
- Prior release baseline verification passed before this contract revision; the latest results are recorded below and a separate final release-verification task remains.
- Route persistence now uses one unordered village pair with required `travelTime` and optional `reverseTravelTime`; migration `005_bidirectional_routes_product_sequence.sql` merges legacy opposite records and preserves asymmetric times.
- Village master data exports only the recurring `reset.afterReset`; legacy `reset.current` input is accepted and removed during WorldData normalization. Simulation and Optimizer receive current reset remaining per run without persistence.
- Market quantities remain positive integer units in WorldData/SQLite. Both market editors derive decimal crates from `unitsPerCrate` and reject crate values that do not resolve to whole units; inventory capacity still uses ceiling crate rules.
- Product create requests omit `id`; SQLite-backed IDs use monotonic `P000001` formatting while legacy IDs such as `MILK` remain unchanged and updateable.
- Current Reset card edits remain client-local until Start Simulation or Run Optimizer; E2E verified that editing does not issue Village persistence requests.
- Responsive browser inspection passed at 1440, 1024, 768, and 390 px for both setup pages, including local error presentation and Optimizer results; no page-level horizontal overflow was observed.
- Representative 22-village/31-route/46-product sparse benchmark: 160 expanded, 439 generated, 44 deduplicated, frontier 30, 139 travel actions pruned, 600 realized profit, 82.08 ms, peak heap 22,493,752 bytes, peak RSS 81,735,680 bytes. Values are host/run-specific; replay passed.
- Strategy risk guidance: lower risk = trade precomputation, crate candidates, reachable-demand scoring; medium = travel/BUY pruning; higher heuristic impact = SELL dominance and trade-chain scoring.
- Presets: Baseline has all seven flags OFF; Balanced enables smartTradeIntelligence, smartTravelPruning, profitableBuyPruning, crateQuantityCandidates, and reachableDemandScoring; Optimized enables all seven; Custom resolves explicit booleans once per run.
- Latest three-preset 22-village/31-route/46-product benchmark (same world/options; host-specific):

| Preset | Profit | Generated | Expanded | Buy/Sell/Travel candidates | Runtime ms | Deduplicated | Frontier | Peak heap | Peak RSS |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 600 | 1,458 | 197 | 594 / 298 / 566 | 216.79 | 510 | 30 | 30,179,264 | 108,249,088 |
| Balanced | 600 | 1,574 | 163 | 15 / 1,212 / 347 | 223.88 | 778 | 30 | 37,918,616 | 144,031,744 |
| Optimized | 600 | 439 | 160 | 54 / 53 / 332 | 71.64 | 44 | 30 | 53,394,192 | 146,087,936 |

- Relative to Baseline: Balanced runtime -3.3% (slower), generated states -8.0% (more), expanded states reduced 17.3%; Optimized runtime reduced 67.0%, generated states reduced 69.9%, expanded states reduced 18.8%.
- Benchmark plans for all three presets replayed through SimulationEngine and achieved the same realized profit. The optimizer remains heuristic Beam Search and does not guarantee global optimality.
- Latest verification: build PASS, 23 Vitest files/114 tests PASS, lint PASS, 4 Playwright E2E flows PASS; focused Worker/API smoke 4 tests PASS.

## Verification History

| Date | Commit | Build | Test | Lint | E2E | Notes |
| ---- | ------ | ----- | ---- | ---- | ---- | ----- |
| 2026-09-14 | `HEAD` | PASS | PASS | PASS | PASS | Optional strategies: 23 files/114 tests, 4 E2E flows, 4 Worker/API smoke tests, and Baseline/Balanced/Optimized benchmark passed. |
