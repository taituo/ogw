import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { startRouteDump, type RouteMemory, type StickyRow } from "../src/state-dump.ts";

test("a dump writes the in-memory routes and the next open reads them back", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ogw-state-"));
  const file = path.join(dir, "routes.sqlite");
  const first = memory([]);
  const dump = startRouteDump(first, file, 0);
  first.rows.push(
    { routeKey: "session\ngpt-5.6-luna", accountId: "go-a" },
    { routeKey: "session\ndeepseek-v4-flash", accountId: "go-b" },
  );
  dump.flush();
  dump.stop();

  const second = memory([{ routeKey: "stale", accountId: "gone" }]);
  const again = startRouteDump(second, file, 0);
  again.stop();
  assert.deepEqual(second.rows, [
    { routeKey: "session\ngpt-5.6-luna", accountId: "go-a" },
    { routeKey: "session\ndeepseek-v4-flash", accountId: "go-b" },
  ]);
});

function memory(rows: StickyRow[]): RouteMemory & { rows: StickyRow[] } {
  return {
    rows,
    stickySnapshot: () => rows,
    restoreSticky(next) { rows.splice(0, rows.length, ...next); },
  };
}
