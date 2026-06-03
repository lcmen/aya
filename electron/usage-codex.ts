// Codex usage, read straight from Codex's own local session logs.
//
// Unlike the Claude path (which needs a hook to fetch from an endpoint), Codex
// writes its official rate-limit percentages INTO the local rollout JSONL — a
// `token_count` event carries a `rate_limits` object with the 5h ("primary")
// and weekly ("secondary") used-percent + reset times. So Aya needs no token,
// no endpoint, no hook: it just reads the newest rollout file. The result is
// the same shared UsageData shape the chip already renders.

import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { UsageData } from "./usage";

const CODEX_HOME =
  process.env.CODEX_HOME && process.env.CODEX_HOME.trim()
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");

function isoFromUnixSeconds(sec: unknown): string | undefined {
  if (typeof sec !== "number" || !Number.isFinite(sec)) return undefined;
  return new Date(sec * 1000).toISOString();
}

/** Map Codex's rate_limits object to Aya's shared UsageData. `primary` is the
 *  5-hour window, `secondary` the weekly one; both carry `used_percent`.
 *  `updatedAtMs` is the time the snapshot was produced (the rollout's mtime),
 *  so the chip's staleness reflects "haven't used Codex lately", not "Aya just
 *  re-read the file". Returns null if the percentages aren't present. */
export function codexUsageFromRateLimit(
  rl: unknown,
  updatedAtMs: number,
): UsageData | null {
  if (typeof rl !== "object" || rl === null) return null;
  const r = rl as {
    primary?: { used_percent?: unknown; resets_at?: unknown };
    secondary?: { used_percent?: unknown; resets_at?: unknown };
  };
  const p = r.primary?.used_percent;
  const s = r.secondary?.used_percent;
  if (typeof p !== "number" || !Number.isFinite(p)) return null;
  if (typeof s !== "number" || !Number.isFinite(s)) return null;
  return {
    fiveHour: { pct: p, resetsAt: isoFromUnixSeconds(r.primary?.resets_at) },
    sevenDay: { pct: s, resetsAt: isoFromUnixSeconds(r.secondary?.resets_at) },
    updatedAt: new Date(updatedAtMs).toISOString(),
  };
}

/** Scan rollout JSONL lines (oldest→newest) and return the rate_limits object
 *  from the LAST line that has one, or null. Tolerant of malformed lines. */
export function latestRateLimit(lines: string[]): unknown {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"rate_limits"')) continue;
    try {
      const obj = JSON.parse(lines[i]) as { payload?: { rate_limits?: unknown } };
      const rl = obj?.payload?.rate_limits;
      if (rl && typeof rl === "object") return rl;
    } catch {
      /* skip a malformed line and keep scanning older ones */
    }
  }
  return null;
}

/** Find the most-recently-modified rollout-*.jsonl under ~/.codex/sessions. */
async function newestRolloutFile(): Promise<{ file: string; mtimeMs: number } | null> {
  const root = path.join(CODEX_HOME, "sessions");
  let best: { file: string; mtimeMs: number } | null = null;
  async function walk(dir: string): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.name.startsWith("rollout-") && e.name.endsWith(".jsonl")) {
        try {
          const st = await fs.stat(full);
          if (!best || st.mtimeMs > best.mtimeMs) {
            best = { file: full, mtimeMs: st.mtimeMs };
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
  await walk(root);
  return best;
}

/** Read Codex's account-wide usage from its newest local rollout. Returns null
 *  if Codex isn't present or no rate-limit event has been written yet. */
export async function readCodexUsage(): Promise<UsageData | null> {
  const newest = await newestRolloutFile();
  if (!newest) return null;
  let raw: string;
  try {
    raw = await fs.readFile(newest.file, "utf-8");
  } catch {
    return null;
  }
  const rl = latestRateLimit(raw.split("\n"));
  if (!rl) return null;
  return codexUsageFromRateLimit(rl, newest.mtimeMs);
}
