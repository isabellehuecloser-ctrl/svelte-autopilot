# 🪄 Svelte Autopilot

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Svelte%20Autopilot-ff3e00?logo=github&logoColor=white)](https://github.com/marketplace/actions/svelte-autopilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**AI code review specialized for Svelte 5 & SvelteKit — on every pull request.**

Generic review bots don't know that a `$effect` setting derived state should be a
`$derived`, that importing `$env/static/private` into a component leaks a secret to
the browser, or that touching `window` at the top level crashes SSR. Svelte Autopilot
does. It reads each PR's diff and leaves a focused review of the issues that actually
matter for Svelte 5 and SvelteKit.

---

## Quick start

1. Add your OpenAI key as a repository secret named `OPENAI_API_KEY`
   (**Settings → Secrets and variables → Actions**).
2. Create `.github/workflows/svelte-review.yml`:

```yaml
name: Svelte Autopilot

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: isabellehuecloser-ctrl/svelte-autopilot@v0
        with:
          api-key: ${{ secrets.OPENAI_API_KEY }}
```

No checkout needed — the diff is read through the GitHub API. Open a PR and the bot
posts (and keeps updating) a single review comment.

---

## What it catches

**Runes & reactivity**
- `$effect` used to compute derived state (should be `$derived`)
- effects that loop by writing state they read
- destructured `$state` losing reactivity
- non-reactive `let` in `.svelte.ts` modules
- mutating non-`$bindable` props

**SvelteKit**
- secrets / private data returned from a **universal** `load` (`+page.ts`) instead of `+page.server.ts`
- `$env/static/private` imported into client-reachable code (**leak**)
- `window` / `document` / `localStorage` at module top level (**SSR crash**)
- form actions, `use:enhance`, and `invalidate` misuse

**Security & a11y**
- `{@html}` on unsanitized input (**XSS**)
- missing `alt`, label association, keyboard handlers

---

## Inputs

| Input          | Required | Default                                  | Description                                   |
| -------------- | -------- | ---------------------------------------- | --------------------------------------------- |
| `api-key`      | yes      | —                                        | OpenAI API key. Pass via a repository secret. |
| `model`        | no       | `gpt-4o`                                 | OpenAI model. `gpt-4o` for best accuracy; `gpt-4o-mini` to cut cost. |
| `github-token` | no       | workflow token                           | Token used to read the PR and post the review.|
| `max-files`    | no       | `20`                                     | Max changed files reviewed per run.           |
| `include`      | no       | `**/*.svelte,**/*.ts,**/*.js,…`          | Comma-separated file extensions to review.    |

## Outputs

| Output           | Description                          |
| ---------------- | ------------------------------------ |
| `findings-count` | Number of review findings reported.  |

---

## How it works

1. Reads the pull request's changed files and their diffs via the GitHub API.
2. Filters to Svelte / SvelteKit source files (skips deps, build output, lockfiles).
3. Sends the diffs to an LLM with a Svelte-5-specialized reviewer prompt.
4. Posts one grouped review comment, updated in place on every push.

You bring your own OpenAI key, so the review runs on your account — no diff passes
through any third-party service besides your chosen AI provider.

## Roadmap

- Inline review comments on exact diff lines
- Hosted Pro version (no API key, usage dashboard)
- Repo-level config (`.svelte-autopilot.json`): severity threshold, custom rules
- Additional providers (Anthropic)

## License

MIT © Isabelle Hue
