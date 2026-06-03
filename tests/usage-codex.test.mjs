// Codex usage comes from the local rollout JSONL (a token_count event carries a
// rate_limits object). These pin the pure mapping + scan before any UI wiring.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  codexUsageFromRateLimit,
  latestRateLimit,
} from "../dist-electron/usage-codex.js";

// The real shape captured from ~/.codex/sessions/.../rollout-*.jsonl.
const SAMPLE = {
  limit_id: "codex",
  primary: { used_percent: 1.0, window_minutes: 300, resets_at: 1780523078 },
  secondary: { used_percent: 25.0, window_minutes: 10080, resets_at: 1780851308 },
  plan_type: "plus",
};

test("maps primary->5h and secondary->weekly used_percent + resets", () => {
  const u = codexUsageFromRateLimit(SAMPLE, 1780000000000);
  assert.equal(u.fiveHour.pct, 1.0);
  assert.equal(u.sevenDay.pct, 25.0);
  assert.equal(u.updatedAt, new Date(1780000000000).toISOString());
  assert.equal(u.fiveHour.resetsAt, new Date(1780523078 * 1000).toISOString());
  assert.equal(u.sevenDay.resetsAt, new Date(1780851308 * 1000).toISOString());
});

test("does NOT swap the windows (5h is primary, not the weekly 25%)", () => {
  const u = codexUsageFromRateLimit(SAMPLE, 0);
  assert.equal(u.fiveHour.pct, 1.0);
  assert.equal(u.sevenDay.pct, 25.0);
});

test("null when a window's used_percent is missing or non-numeric", () => {
  assert.equal(codexUsageFromRateLimit({ primary: { used_percent: 1 } }, 0), null);
  assert.equal(
    codexUsageFromRateLimit(
      { primary: { used_percent: "1" }, secondary: { used_percent: 2 } },
      0,
    ),
    null,
  );
  assert.equal(
    codexUsageFromRateLimit(
      { primary: { used_percent: NaN }, secondary: { used_percent: 2 } },
      0,
    ),
    null,
  );
});

test("null for null / non-object", () => {
  assert.equal(codexUsageFromRateLimit(null, 0), null);
  assert.equal(codexUsageFromRateLimit(42, 0), null);
});

test("resetsAt omitted when resets_at is absent", () => {
  const u = codexUsageFromRateLimit(
    { primary: { used_percent: 1 }, secondary: { used_percent: 2 } },
    0,
  );
  assert.equal(u.fiveHour.resetsAt, undefined);
});

test("latestRateLimit returns rate_limits from the LAST line that has one", () => {
  const lines = [
    JSON.stringify({ payload: { type: "agent_message" } }),
    JSON.stringify({
      payload: { type: "token_count", rate_limits: { primary: { used_percent: 5 } } },
    }),
    JSON.stringify({ payload: { foo: 1 } }),
    JSON.stringify({
      payload: { type: "token_count", rate_limits: { primary: { used_percent: 9 } } },
    }),
  ];
  assert.equal(latestRateLimit(lines).primary.used_percent, 9); // last, not 5
});

test("latestRateLimit tolerates malformed lines and returns null when none", () => {
  assert.equal(latestRateLimit(["not json {", "", '{"payload":{}}']), null);
  const lines = [
    "{ broken",
    JSON.stringify({ payload: { rate_limits: { primary: { used_percent: 7 } } } }),
    "also broken {",
  ];
  assert.equal(latestRateLimit(lines).primary.used_percent, 7);
});

test("end-to-end: latestRateLimit feeds codexUsageFromRateLimit", () => {
  const line = JSON.stringify({
    payload: { type: "token_count", rate_limits: SAMPLE },
  });
  const u = codexUsageFromRateLimit(latestRateLimit([line]), 0);
  assert.equal(u.fiveHour.pct, 1.0);
  assert.equal(u.sevenDay.pct, 25.0);
});
