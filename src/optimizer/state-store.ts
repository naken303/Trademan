import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export interface DominanceScore {
  accumulatedProfit: number;
  liquidationPotential: number;
  tradeActions: number;
  playerMoney: number;
  planLength: number;
}

export interface OptimizerStateStore {
  accepts(signature: string, score: DominanceScore): boolean;
  size(): number;
  close(): void;
  destroy(): void;
}

function better(next: DominanceScore, previous: DominanceScore) {
  return next.accumulatedProfit > previous.accumulatedProfit
    || (next.accumulatedProfit === previous.accumulatedProfit && next.liquidationPotential > previous.liquidationPotential)
    || (next.accumulatedProfit === previous.accumulatedProfit && next.liquidationPotential === previous.liquidationPotential && next.tradeActions > previous.tradeActions)
    || (next.accumulatedProfit === previous.accumulatedProfit && next.liquidationPotential === previous.liquidationPotential && next.tradeActions === previous.tradeActions && next.playerMoney > previous.playerMoney)
    || (next.accumulatedProfit === previous.accumulatedProfit && next.liquidationPotential === previous.liquidationPotential && next.tradeActions === previous.tradeActions && next.playerMoney === previous.playerMoney && next.planLength < previous.planLength);
}

/** A disposable per-run SQLite index. It stores only a SHA-256 identity and compact score metadata. */
export class TempSqliteOptimizerStateStore implements OptimizerStateStore {
  private readonly directory = mkdtempSync(path.join(tmpdir(), "VillageTradePlanner-optimizer-"));
  private readonly database = new Database(path.join(this.directory, "states.sqlite"));
  private readonly get: Database.Statement;
  private readonly put: Database.Statement;

  constructor() {
    this.database.pragma("journal_mode = OFF");
    this.database.pragma("synchronous = OFF");
    this.database.exec("CREATE TABLE seen (signature TEXT PRIMARY KEY, profit REAL NOT NULL, potential REAL NOT NULL, trades INTEGER NOT NULL, money REAL NOT NULL, plan_length INTEGER NOT NULL)");
    this.get = this.database.prepare("SELECT profit, potential, trades, money, plan_length FROM seen WHERE signature = ?");
    this.put = this.database.prepare("INSERT INTO seen(signature, profit, potential, trades, money, plan_length) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(signature) DO UPDATE SET profit=excluded.profit, potential=excluded.potential, trades=excluded.trades, money=excluded.money, plan_length=excluded.plan_length");
  }

  accepts(signature: string, score: DominanceScore) {
    const key = createHash("sha256").update(signature).digest("hex");
    const row = this.get.get(key) as { profit: number; potential: number; trades: number; money: number; plan_length: number } | undefined;
    const previous = row && { accumulatedProfit: row.profit, liquidationPotential: row.potential, tradeActions: row.trades, playerMoney: row.money, planLength: row.plan_length };
    if (previous && !better(score, previous)) return false;
    this.put.run(key, score.accumulatedProfit, score.liquidationPotential, score.tradeActions, score.playerMoney, score.planLength);
    return true;
  }

  size() { return (this.database.prepare("SELECT COUNT(*) AS count FROM seen").get() as { count: number }).count; }
  close() { this.database.close(); }
  destroy() { try { this.close(); } catch { /* already closed */ } rmSync(this.directory, { recursive: true, force: true }); }
}

export function createTempOptimizerStateStore() { return new TempSqliteOptimizerStateStore(); }
