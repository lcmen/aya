import { test, expect } from "./fixtures";

test.describe("with a usage snapshot", () => {
  // Seed the usage.json a user hook would write, so the account-wide chip
  // renders. updatedAt is fresh so it isn't dimmed as stale.
  test.use({
    seedOptions: {
      usage: {
        fiveHour: { pct: 30, resetsAt: "2026-12-01T17:20:00Z" },
        sevenDay: { pct: 55, resetsAt: "2026-12-06T15:00:00Z" },
        updatedAt: new Date().toISOString(),
      },
    },
  });

  test("chip shows the weekly percent and an account-wide popover", async ({
    window,
  }) => {
    // The chip shows the weekly (account-cap) percent at a glance.
    const chip = window.getByRole("button", { name: /account-wide/i });
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("55%");

    // Opening it reveals the breakdown, explicitly framed as account-wide (not
    // this project) — the whole point, so the global numbers aren't misread as
    // per-project. Both windows' percentages are shown.
    await chip.click();
    await expect(window.getByText("Claude — account-wide")).toBeVisible();
    await expect(
      window.getByText("all sessions, not this project"),
    ).toBeVisible();
    await expect(window.getByText("5h", { exact: true })).toBeVisible();
    await expect(window.getByText("week", { exact: true })).toBeVisible();
    await expect(window.getByText("30%")).toBeVisible();
  });
});

test.describe("without a usage snapshot", () => {
  test.use({ seedOptions: {} });

  test("no chip when the snapshot file is absent", async ({ window }) => {
    // File absent → chip hidden, never a broken empty button.
    await expect(
      window.getByRole("button", { name: /account-wide/i }),
    ).toHaveCount(0);
  });
});

test.describe("with a Codex rollout", () => {
  // Codex usage comes from its local rollout (no hook/token). Seed one with a
  // rate_limits event; the Codex chip should render its weekly percent.
  test.use({
    seedOptions: {
      codexRateLimits: {
        primary: { used_percent: 12, window_minutes: 300, resets_at: 1780523078 },
        secondary: { used_percent: 40, window_minutes: 10080, resets_at: 1780851308 },
      },
    },
  });

  test("Codex chip shows the weekly percent and its own popover", async ({
    window,
  }) => {
    const chip = window.getByRole("button", {
      name: /codex usage, account-wide/i,
    });
    await expect(chip).toBeVisible();
    await expect(chip).toContainText("40%");
    await chip.click();
    await expect(window.getByText("Codex — account-wide")).toBeVisible();
  });
});
