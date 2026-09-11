# Village Trade Planner

Local TypeScript application for editing a trading world, simulating travel and trades, and searching bounded profit-maximizing plans.

## Requirements

- Node.js 24 or another version compatible with the dependencies in `package.json`
- npm

## Setup and development

```powershell
npm install
npm run server
```

In a second terminal:

```powershell
npm run dev
```

The frontend uses Vite and the backend uses Express with a local SQLite database. Runtime simulation progress is session-only; saved world configuration persists locally. Server startup does not automatically replace the saved world with demo data.

## Verification

```powershell
npm run build
npm run test
npm run lint
npm run e2e
```

Playwright E2E tests create an isolated temporary SQLite database and backup directory. See [docs/release-smoke-checklist.md](docs/release-smoke-checklist.md) for the concise manual release flow.
