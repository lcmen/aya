import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function writeTerminalOutput(window: Page, payload: string) {
  const command = `printf %b ${shellSingleQuote(`\\033[2J\\033[H${payload}`)}\r`;
  await window.getByTestId("xterm-host").first().click();
  await window.keyboard.insertText(command);
}

test("terminal context menu can paste clipboard text", async ({ window, app }) => {
  await app.evaluate(async ({ clipboard }) => {
    clipboard.writeText("echo AYA_CONTEXT_PASTE\\n");
  });

  await window.getByTestId("xterm-host").first().click({ button: "right" });
  const menu = window.getByTestId("terminal-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByTestId("terminal-context-paste").click();

  await expect(window.getByTestId("terminal-context-menu")).toHaveCount(0);
  await expect
    .poll(() =>
      window.evaluate(() =>
        Array.from(document.querySelectorAll(".xterm-rows > div"))
          .map((row) => row.textContent ?? "")
          .join("\n"),
      ),
    )
    .toContain("AYA_CONTEXT_PASTE");
});

test("terminal context menu exposes an http link without navigating Aya", async ({
  window,
}) => {
  await writeTerminalOutput(window, "Open https://example.com/aya-polish now\\n");

  const row = window.locator(".xterm-rows > div", {
    hasText: "https://example.com/aya-polish",
  });
  await expect(row).toBeVisible();
  await window.getByTestId("xterm-host").first().click({ button: "right" });

  const menu = window.getByTestId("terminal-context-menu");
  await expect(menu).toBeVisible();
  await menu.getByTestId("terminal-context-open-link").click();

  await expect(window.getByTestId("terminal-context-menu")).toHaveCount(0);
  await expect
    .poll(() => window.evaluate(() => location.href.startsWith("http://example.com")))
    .toBe(false);
});
