import assert from "node:assert/strict";
import test from "node:test";
import { openCodeRequestOptions, routeKey } from "../src/router/open-code-stack-models.ts";

test("two models in one session get different route slots", () => {
  const luna = routeKey("session-1", "gpt-5.6-luna");
  const flash = routeKey("session-1", "deepseek-v4-flash");
  assert.notEqual(luna, flash);
  assert.equal(routeKey(undefined, "gpt-5.6-luna"), undefined);
});

test("OpenCode session is an HTTP header, not only Pi's sessionId", () => {
  const options = openCodeRequestOptions({ headers: { "x-extra": "1" } }, "sess::ocgo::go-a");
  assert.equal(options.sessionId, "sess::ocgo::go-a");
  assert.equal(options.headers?.["x-opencode-session"], "sess::ocgo::go-a");
  assert.equal(options.headers?.["x-extra"], "1");
});
