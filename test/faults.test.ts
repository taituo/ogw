import assert from "node:assert/strict";
import test from "node:test";
import { FaultGate, parseFaultSpec } from "../src/faults.ts";

test("a standing reset hits only the named account and keeps firing", () => {
  const gate = new FaultGate(parseFaultSpec("go-a:reset,go-b/deepseek-v4-flash:502"));
  const first = gate.take("go-a", "gpt-5.6-luna");
  assert.equal(first?.fault, "reset");
  assert.equal(first?.failure, "timeout");
  assert.match(first?.message ?? "", /ECONNRESET/);
  assert.equal(gate.take("go-b", "gpt-5.6-luna"), undefined);
  const second = gate.take("go-b", "deepseek-v4-flash");
  assert.equal(second?.failure, "provider_5xx");
  assert.equal(gate.take("go-a", "gpt-5.6-luna")?.fault, "reset");
});

test("an armed fault fires once", () => {
  const gate = new FaultGate();
  gate.arm("timeout");
  assert.equal(gate.take("go-b", "kimi-k2.7-code")?.fault, "timeout");
  assert.equal(gate.take("go-b", "kimi-k2.7-code"), undefined);
});
