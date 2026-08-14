# AGENTS.md

## Project

This repository is a fork of `huangbai-AI/OpenWork`.

Local path:

`D:\MyWorks\OpenWork`

Use `main` as the stable baseline.

All of our new development must be done on:

`chris-changes`

Before modifying code, confirm the current branch. Do not develop directly on `main`.

`feature/openwork-visual-refinement` is a reference branch only. It contains later upstream experiments and enhancements. Reuse useful parts selectively; do not merge the whole branch unless explicitly requested.

## Working Approach

Before substantial changes:

1. Understand the relevant existing code and data flow.
2. Compare with `feature/openwork-visual-refinement` when it may already contain a useful implementation.
3. Prefer small, focused changes over large merges or unrelated refactoring.
4. Preserve existing working behaviour unless the requested change requires otherwise.
5. Run relevant tests or validation after changes.

For larger changes, briefly explain the current behaviour, proposed approach, affected files and risks before implementation.

## Areas of Interest

Likely future work includes:

- improving existing functionality and UI;
- job-data collection and refresh;
- rolling recent-job windows;
- resilience when individual data sources fail;
- location enrichment;
- data validation and freshness checks;
- automated data refresh;
- bug fixes and maintainability improvements.

Do not implement these automatically unless requested.

## Project Memory

Keep Codex working notes under:

`codex/`

Create files only when useful. Recommended files:

```text
codex/
├── project-memory.md
├── worklog.md
├── decisions.md
├── handoff.md
├── investigations/
└── plans/
```

Use them as follows:

- `project-memory.md` — durable knowledge about architecture, data flow, commands and important discoveries.
- `worklog.md` — concise chronological record of substantial work.
- `decisions.md` — important technical decisions and reasons.
- `handoff.md` — current state, completed work, unresolved issues and recommended next step.
- `investigations/` — larger research or comparison notes.
- `plans/` — implementation plans when needed.

At the start of a substantial session, read `AGENTS.md`, check Git status/branch, and read `codex/handoff.md` plus relevant project memory.

At the end of substantial work, update the relevant memory and handoff files.

## Documentation and Temporary Files

Project documentation belongs under:

`docs/`

Examples:

- architecture
- data pipeline
- data sources
- development notes

Temporary analysis, generated files, screenshots or test output belong under:

`temp/`

Do not scatter temporary files through the repository.

`codex/`, `docs/` and `temp/` are intentionally ignored by Git. Do not remove them from `.gitignore` unless requested.

## Git and Safety

Do not:

- force-push;
- hard-reset or rewrite important history;
- delete remote branches;
- discard user changes;
- make unrelated changes.

When reusing upstream code, inspect the relevant commits/files first. Prefer selective adaptation over broad cherry-picks or merges.

## Validation

Do not claim a change works without checking it.

Use relevant tests, smoke tests, application startup, data validation or browser verification where appropriate.

For data-related changes, compare useful before/after metrics such as job counts, source distribution, failures and rejected records.

## Goal

Build a stable, understandable and progressively improved OpenWork version on `chris-changes`, using:

- `main` as the stable foundation;
- `feature/openwork-visual-refinement` as a selective reference;
- careful testing;
- concise project memory and handoff documentation.