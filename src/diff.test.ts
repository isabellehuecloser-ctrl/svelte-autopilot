import { describe, it, expect } from "vitest";
import { allowedExtensions, isReviewable } from "./diff.js";
import { formatReview } from "./comment.js";
import { buildUserMessage } from "./prompt.js";
import type { Finding } from "./types.js";

describe("allowedExtensions", () => {
  it("extracts extensions from a glob/extension list", () => {
    expect(allowedExtensions("**/*.svelte,**/*.ts")).toEqual([".svelte", ".ts"]);
  });
});

describe("isReviewable", () => {
  const exts = [".svelte", ".ts", ".js"];
  it("accepts Svelte and TS source files", () => {
    expect(isReviewable("src/routes/+page.svelte", exts)).toBe(true);
    expect(isReviewable("src/lib/api.ts", exts)).toBe(true);
  });
  it("skips deps, build output, lockfiles, type defs and assets", () => {
    expect(isReviewable("node_modules/x/index.ts", exts)).toBe(false);
    expect(isReviewable(".svelte-kit/generated/root.ts", exts)).toBe(false);
    expect(isReviewable("package-lock.json", exts)).toBe(false);
    expect(isReviewable("src/app.d.ts", exts)).toBe(false);
    expect(isReviewable("static/logo.png", exts)).toBe(false);
  });
});

describe("formatReview", () => {
  it("reports a clean review when there are no findings", () => {
    const out = formatReview([]);
    expect(out).toContain("No Svelte 5");
    expect(out).toContain("<!-- svelte-autopilot -->");
  });
  it("groups findings by file with severity and location", () => {
    const findings: Finding[] = [
      { file: "a.svelte", line: 10, severity: "critical", issue: "private env leaked", suggestion: "move to +page.server.ts" },
      { file: "a.svelte", line: null, severity: "warning", issue: "$effect used to derive state", suggestion: "" },
    ];
    const out = formatReview(findings);
    expect(out).toContain("**`a.svelte`**");
    expect(out).toContain("🔴 **Critical** (L10): private env leaked — move to +page.server.ts");
    expect(out).toContain("🟡 **Warning**: $effect used to derive state");
    expect(out).toContain("Found **2** item(s)");
  });
});

describe("buildUserMessage", () => {
  it("includes the file path and its patch", () => {
    const msg = buildUserMessage([
      { path: "x.svelte", patch: "+let a = $state(0)", status: "modified" },
    ]);
    expect(msg).toContain("FILE: x.svelte");
    expect(msg).toContain("$state(0)");
  });
});
