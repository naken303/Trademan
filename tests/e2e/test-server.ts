import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporaryRoot = mkdtempSync(join(tmpdir(), "village-trade-e2e-"));
process.env.VILLAGE_TRADE_DATABASE_PATH = join(temporaryRoot, "world.sqlite");
process.env.VILLAGE_TRADE_BACKUP_DIRECTORY = join(temporaryRoot, "backups");

const [{ createApp }, { db, loadDemoWorld }] = await Promise.all([
  import("../../src/server/app"),
  import("../../src/server/database"),
]);

const port = Number(process.env.PORT ?? 3100);
const app = createApp();
loadDemoWorld();
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`E2E server running at http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    rmSync(temporaryRoot, { recursive: true, force: true });
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
