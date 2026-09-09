---
name: village-trade-planner-workflow
description: Execute focused Village Trade Planner tasks with minimal rediscovery, verified contracts, and terse handoffs. Use for implementation, tests, reviews, or status work in this repository.
---

# Village Trade Planner Workflow

## Goal

Finish one bounded outcome with the smallest safe change and a checkable handoff. Do not spend context reconstructing work that the repository already records.

## Source of truth

Resolve conflicts in this order: the user's current request; `AGENTS.md`; relevant code/types/schemas/migrations/tests; `docs/project-spec.md`; `docs/codex-status.md`; prior chat summaries. Status is an index and evidence log, never proof by itself. `package.json` scripts are authoritative for commands.

Read `AGENTS.md`, then `docs/codex-status.md` if present. Read the specification only for domain, simulation, persistence, or optimizer work. Search first; open only the task's implementation, boundary contract, direct callers, and tests. Do not re-read unchanged files or scan unrelated directories.

## Start protocol

Inspect only: current Git status, branch, recent commits, package scripts, and task-relevant files. State one terse line before work:

`Plan: <outcome> | <likely files> | verify: <commands>`

If the task is ambiguous enough to change product behavior, report the decision needed; otherwise make the least surprising scoped assumption.

## Scope and contracts

- One task = one user-visible outcome. Split work when it spans unrelated features, more than one data contract, or roughly more than 8 changed files.
- For a contract/data change, trace the full affected path: shared type + Zod boundary + persistence/migration + API/client caller + tests. Do not use casts or defaults to conceal a mismatch.
- Preserve domain rules unless the user explicitly changes them. Keep routes, repositories, simulation, UI, and SQLite responsibilities separate.
- Prefer existing patterns and tests. Do not refactor, reformat, update dependencies, or fix unrelated findings; record material findings instead.

## Execution and verification

Make a small coherent patch. After each meaningful change, run the narrowest relevant test. For any code change, run the repository's build and test scripts before handoff; also run lint when it exists and the task changes client code, lint-sensitive code, or is being committed. Use the project's actual script names.

If a check fails, report its exact command and concise cause. Do not claim PASS from an earlier run or from a status note.

Before proposing a commit, inspect `git diff --stat`, the relevant diff, and Git status. Never commit, push, reset, delete, or alter the runtime SQLite database unless the user explicitly authorizes it.

## Status note

Update `docs/codex-status.md` only when a task changes tracked behavior/tests/persistence, changes phase or known issues, or records a new full verification result. Record only facts: commit/branch, changed files, compact decision, and build/test/lint outcomes. Keep one current verification row; no command logs, copied diffs, or repeated narrative. Do not update it for investigation-only or no-change tasks.

## Communication budget

Use at most one progress update after the plan, unless blocked or work lasts long enough to need another. Each update is one sentence: `Done: ...` / `Blocked: ...` / `Checking: ...`. Do not restate the task, paste source, logs, or generic explanations.

## Final response

Use this compact form (omit empty lines):

`Done: <outcome>.`

`Changed: <files or none>.`

`Verified: build <PASS/FAIL/NOT RUN>; test <...>; lint <...>.`

`Next: <one concrete item or none>.`

