# scaffold

SDLC workflow commands for Claude Code.

## What It Does

- Ships 8 workflow commands: `/plan`, `/design`, `/refine`, `/build`,
  `/test`, `/review`, `/audit`, `/customize`
- Ships 7 rules files: `quality-bar.md`, `tests.md`, `error_handling.md`,
  `context7-lookup.md`, `git-workflow.md`, `issue-breakdown.md`,
  `self-running-architecture.md`
- `/scaffold` copies templates into the project on demand (idempotent —
  never overwrites existing files). Nothing happens automatically.
- `/customize` detects the project's stack and populates routing tables,
  rules file project-specific sections, and Linear CLI settings

## Install

Requires Claude Code.

```bash
/plugin marketplace add slgoodrich/scaffold
/plugin install scaffold
```

Installing the plugin makes `/scaffold` and `/customize` available but
does **not** copy any files into your projects automatically. The
scaffold workflow is opt-in per project.

## Adopting the workflow in a project

In a project where you want to use the scaffold workflow:

```
/scaffold
```

This copies templates into:

- `.claude/commands/` — workflow commands
- `.claude/rules/` — code quality, testing, git workflow, architecture rules
- Project root — `CLAUDE.md` and `.linear.toml` scaffolds

Then run `/customize` to populate stack-specific bits (agent routing,
rules sections, Linear CLI skill, pre-commit hooks).

Both commands are idempotent and safe to re-run.

## Workflow

Manual upstream work uses `/plan`, `/design`, `/refine` to develop the
spec in a Linear issue. When the issue is ready, run `/build`, `/test`,
`/review` to implement, test, and review the changes.

For the full workflow, see `.claude-plugin/CLAUDE.md`.

## Requirements

- Claude Code
- `linear` CLI and `LINEAR_API_KEY` env var for Linear integration

## License

MIT
