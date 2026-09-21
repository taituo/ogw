import { DatabaseSync } from "node:sqlite";

export interface StickyRow {
  routeKey: string;
  accountId: string;
}

export interface RouteMemory {
  stickySnapshot(): StickyRow[];
  restoreSticky(rows: StickyRow[]): void;
}

/**
 * The live route table stays in memory. When a file is set, that table is
 * copied into SQLite on an interval and read back at startup. The schema is
 * one table on purpose.
 */
export function startRouteDump(memory: RouteMemory, file: string, intervalMs: number): { flush(): void; stop(): void } {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS route_sticky (
    route_key TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  const listed = db.prepare("SELECT route_key, account_id FROM route_sticky");
  const insert = db.prepare("INSERT INTO route_sticky (route_key, account_id, updated_at) VALUES (?, ?, ?)");
  const clear = db.prepare("DELETE FROM route_sticky");
  memory.restoreSticky(listed.all().map((row) => ({
    routeKey: String(row.route_key),
    accountId: String(row.account_id),
  })));

  const flush = () => {
    const rows = memory.stickySnapshot();
    db.exec("BEGIN");
    try {
      clear.run();
      const now = Date.now();
      for (const row of rows) insert.run(row.routeKey, row.accountId, now);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };
  const timer = intervalMs > 0
    ? setInterval(() => {
        try { flush(); } catch (error) { console.error("route dump failed", error instanceof Error ? error.message : error); }
      }, intervalMs)
    : undefined;
  timer?.unref();
  const stop = () => {
    if (timer) clearInterval(timer);
    flush();
    db.close();
  };
  return { flush, stop };
}
