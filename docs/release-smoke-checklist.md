# Manual Release Smoke Checklist

1. Start the backend with `npm run server` and frontend with `npm run dev`.
2. Open the app and confirm World data, village positions, routes, market summaries, Product Palette search, and both Images/Details modes load.
3. Create, edit, and delete a Product, Village, Route, and Market; confirm each list refreshes and Product base prices remain defaults rather than overwriting existing Market prices.
4. Save Database & Settings changes, including initial inventory, then reload and confirm persistence.
5. Export WorldData JSON, reject/cancel an invalid import, import a valid export after confirmation, and create a backup.
6. In Simulation, buy a product, travel, and sell it; confirm time, resets, money, inventory, crates, reserve, and profit update.
7. Reload the app: persisted configuration must remain, while runtime Simulation progress must restart from saved settings.
