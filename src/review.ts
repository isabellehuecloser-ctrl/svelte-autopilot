import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.js";
import type { ChangedFile, Finding, Severity } from "./types.js";

const CHARS_PER_BATCH = 24000;
const VALID_SEVERITIES: Severity[] = ["critical", "warning", "suggestion"];
const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, suggestion: 2 };

/** Group files into batches that stay under the per-call character budget. */
function chunkFiles(files: ChangedFile[]): ChangedFile[][] {
  const batches: ChangedFile[][] = [];
  let current: ChangedFile[] = [];
  let size = 0;
  for (const f of files) {
    const patch =
      f.patch.length > CHARS_PER_BATCH
        ? f.patch.slice(0, CHARS_PER_BATCH) + "\n... (diff truncated)"
        : f.patch;
    const len = patch.length + f.path.length;
    if (current.length > 0 && size + len > CHARS_PER_BATCH) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push({ ...f, patch });
    size += len;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function parseFindings(raw: string): Finding[] {
  let data: { findings?: unknown };
  try {
    data = JSON.parse(raw) as { findings?: unknown };
  } catch {
    return [];
  }
  if (!Array.isArray(data.findings)) return [];
  const out: Finding[] = [];
  for (const entry of data.findings) {
    if (typeof entry !== "object" || entry === null) continue;
    const f = entry as Record<string, unknown>;
    if (typeof f.file !== "string" || typeof f.issue !== "string") continue;
    const severity = VALID_SEVERITIES.includes(f.severity as Severity)
      ? (f.severity as Severity)
      : "suggestion";
    out.push({
      file: f.file,
      line: typeof f.line === "number" ? f.line : null,
      severity,
      issue: f.issue,
      suggestion: typeof f.suggestion === "string" ? f.suggestion : "",
    });
  }
  return out;
}

function dedupeAndSort(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];
  for (const f of findings) {
    const key = `${f.file}|${f.line}|${f.issue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return out;
}

export async function reviewFiles(
  files: ChangedFile[],
  opts: { apiKey: string; model: string }
): Promise<Finding[]> {
  const client = new OpenAI({ apiKey: opts.apiKey, timeout: 60000 });
  const batches = chunkFiles(files);
  const all: Finding[] = [];

  // Surface oversized diffs: a file whose patch exceeds the budget is only partially
  // reviewed, so the review may be incomplete — tell the user instead of failing silently.
  for (const f of files) {
    if (f.patch.length > CHARS_PER_BATCH) {
      all.push({
        file: f.path,
        line: null,
        severity: "suggestion",
        issue: `Diff too large — only the first ${CHARS_PER_BATCH.toLocaleString()} characters were reviewed; this file's review may be incomplete.`,
        suggestion: "Split large changes into smaller PRs for full coverage.",
      });
    }
  }

  for (const batch of batches) {
    const userMessage = buildUserMessage(batch);
    let raw = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await client.chat.completions.create({
          model: opts.model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
        });
        raw = res.choices[0]?.message?.content ?? "";
        break;
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
    all.push(...parseFindings(raw));
  }

  return dedupeAndSort(all);
}
