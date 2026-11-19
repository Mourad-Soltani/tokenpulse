import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dashboardHtml } from "../src/admin.ts";

describe("dashboard client script", () => {
  it("is syntactically valid JavaScript (node --check)", () => {
    const html = dashboardHtml();
    const matches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(matches.length >= 1, "dashboard HTML should contain at least one <script>");
    // Prefer the largest script block (the client app)
    const js = matches.reduce((a, b) => (a[1].length > b[1].length ? a : b))[1];
    assert.ok(js.trim().length > 100, "client script should be non-trivial");

    const path = join(tmpdir(), `tp-dash-syntax-${process.pid}.js`);
    writeFileSync(path, js, "utf8");
    try {
      execSync(`node --check ${JSON.stringify(path)}`, { stdio: "pipe" });
    } catch (err) {
      const e = err as { stderr?: Buffer; message?: string };
      const detail = e.stderr ? e.stderr.toString() : e.message;
      assert.fail(`dashboard client JS failed node --check:\n${detail}`);
    } finally {
      try {
        unlinkSync(path);
      } catch {
        /* ignore */
      }
    }
  });
});
