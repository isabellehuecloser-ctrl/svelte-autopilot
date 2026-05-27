import * as github from "@actions/github";
import type { ChangedFile } from "./types.js";

type Octo = ReturnType<typeof github.getOctokit>;

const ALWAYS_SKIP = [
  "node_modules/",
  ".svelte-kit/",
  "/dist/",
  "/build/",
  "/.vercel/",
  "/vendor/",
];

const SKIP_SUFFIX = [
  ".min.js",
  ".d.ts",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
];

/** Turn an include glob/extension list into the set of allowed extensions. */
export function allowedExtensions(include: string): string[] {
  return include
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const dot = p.lastIndexOf(".");
      return dot === -1 ? p.toLowerCase() : p.slice(dot).toLowerCase();
    });
}

export function isReviewable(path: string, exts: string[]): boolean {
  const lower = path.toLowerCase();
  if (ALWAYS_SKIP.some((s) => ("/" + lower).includes(s))) return false;
  if (SKIP_SUFFIX.some((s) => lower.endsWith(s))) return false;
  return exts.some((e) => lower.endsWith(e));
}

export async function listChangedFiles(
  octokit: Octo,
  owner: string,
  repo: string,
  prNumber: number,
  opts: { include: string; maxFiles: number }
): Promise<ChangedFile[]> {
  const exts = allowedExtensions(opts.include);
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const reviewable: ChangedFile[] = [];
  for (const f of files) {
    if (f.status === "removed") continue;
    if (!f.patch) continue; // binary or too large to diff
    if (!isReviewable(f.filename, exts)) continue;
    reviewable.push({ path: f.filename, patch: f.patch, status: f.status });
    if (reviewable.length >= opts.maxFiles) break;
  }
  return reviewable;
}
