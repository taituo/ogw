import assert from "node:assert/strict";
import test from "node:test";
import { routeKey } from "../src/router/open-code-stack-models.ts";

test("two models in one session get different route slots", () => {
  const luna = routeKey("session-1", "gpt-5.6-luna");
  const flash = routeKey("session-1", "deepseek-v4-flash");
  assert.notEqual(luna, flash);
  assert.equal(routeKey(undefined, "gpt-5.6-luna"), undefined);
});
