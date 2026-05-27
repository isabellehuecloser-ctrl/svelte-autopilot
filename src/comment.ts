import * as github from "@actions/github";
import type { Finding, Severity } from "./types.js";

type Octo = ReturnType<typeof github.getOctokit>;

const MARKER = "<!-- svelte-autopilot -->";
const HEADER = "### 🪄 Svelte Autopilot review";
const EMOJI: Record<Severity, string> = { critical: "🔴", warning: "🟡", suggestion: "🔵" };
const LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  suggestion: "Suggestion",
};
const FOOTER =
  "\n\n---\n<sub>🪄 Reviewed by [Svelte Autopilot](https://github.com/marketplace/actions/svelte-autopilot) — AI code review for Svelte 5 & SvelteKit, on every PR.</sub>";

export function formatReview(findings: Finding[]): string {
  if (findings.length === 0) {
    return `${MARKER}\n${HEADER}\n\nNo Svelte 5 / SvelteKit issues found in the changed files. ✅${FOOTER}`;
  }

  const counts: Record<Severity, number> = { critical: 0, warning: 0, suggestion: 0 };
  for (const f of findings) counts[f.severity]++;
  const summary = `Found **${findings.length}** item(s): ${counts.critical} 🔴 critical · ${counts.warning} 🟡 warning · ${counts.suggestion} 🔵 suggestion`;

  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const arr = byFile.get(f.file) ?? [];
    arr.push(f);
    byFile.set(f.file, arr);
  }

  const blocks: string[] = [];
  for (const [file, items] of byFile) {
    const lines = items.map((f) => {
      const loc = f.line != null ? ` (L${f.line})` : "";
      const sug = f.suggestion ? ` — ${f.suggestion}` : "";
      return `- ${EMOJI[f.severity]} **${LABEL[f.severity]}**${loc}: ${f.issue}${sug}`;
    });
    blocks.push(`**\`${file}\`**\n${lines.join("\n")}`);
  }

  return [MARKER, HEADER, "", summary, "", ...blocks].join("\n") + FOOTER;
}

/** Post the review, updating the previous Svelte Autopilot comment if one exists. */
export async function postReview(
  octokit: Octo,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });
  const existing = comments.find((c) => typeof c.body === "string" && c.body.includes(MARKER));
  if (existing) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }
}
