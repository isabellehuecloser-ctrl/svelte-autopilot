import * as core from "@actions/core";
import * as github from "@actions/github";
import { listChangedFiles } from "./diff.js";
import { reviewFiles } from "./review.js";
import { formatReview, postReview } from "./comment.js";

async function run(): Promise<void> {
  const apiKey = core.getInput("api-key", { required: true });
  const model = core.getInput("model") || "gpt-4o-mini";
  const token = core.getInput("github-token");
  const maxFiles = Number.parseInt(core.getInput("max-files") || "20", 10) || 20;
  const include =
    core.getInput("include") ||
    "**/*.svelte,**/*.svelte.ts,**/*.svelte.js,**/*.ts,**/*.js";

  const pr = github.context.payload.pull_request;
  if (!pr) {
    core.info("Not a pull_request event; nothing to review.");
    core.setOutput("findings-count", 0);
    return;
  }
  if (!token) {
    core.setFailed("github-token is required to read the pull request and post the review.");
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const prNumber = pr.number;

  const files = await listChangedFiles(octokit, owner, repo, prNumber, { include, maxFiles });
  if (files.length === 0) {
    core.info("No reviewable Svelte / SvelteKit files changed in this pull request.");
    core.setOutput("findings-count", 0);
    return;
  }
  core.info(`Reviewing ${files.length} changed file(s) with ${model}...`);

  const findings = await reviewFiles(files, { apiKey, model });
  core.info(`Review complete: ${findings.length} finding(s).`);

  const body = formatReview(findings);
  try {
    await postReview(octokit, owner, repo, prNumber, body);
  } catch (err) {
    core.warning(
      `Could not post the review comment: ${(err as Error).message}. ` +
        "Pull requests from forks only get a read-only token, so the bot cannot comment on them."
    );
  }

  core.setOutput("findings-count", findings.length);
}

run().catch((err) => core.setFailed((err as Error).message));
