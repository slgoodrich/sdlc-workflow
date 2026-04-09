# scaffold

SDLC workflow commands and Agent Orchestrator scaffolding for Claude Code.

## What It Does

- Ships 8 workflow commands: `/plan`, `/design`, `/refine`, `/build`,
  `/test`, `/review`, `/audit`, `/customize`
- Ships 7 rules files: `quality-bar.md`, `tests.md`, `error_handling.md`,
  `context7-lookup.md`, `git-workflow.md`, `issue-breakdown.md`,
  `self-running-architecture.md`
- Ships an Agent Orchestrator config template and worker rules file
- `/scaffold` copies templates into the project on demand (idempotent —
  never overwrites existing files). Nothing happens automatically.
- `/customize` detects the project's stack and populates routing tables,
  rules file project-specific sections, AO config, and Linear CLI settings

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
- `.ao/` — Agent Orchestrator worker rules
- Project root — `agent-orchestrator.yaml` and `CLAUDE.md` scaffolds

Then run `/customize` to populate stack-specific bits (agent routing,
rules sections, AO config, Linear CLI skill, pre-commit hooks).

Both commands are idempotent and safe to re-run.

## Workflow

Manual upstream work uses `/plan`, `/design`, `/refine` to develop the
spec in a Linear issue. Move the issue to "Ready to Build" to hand off
to Agent Orchestrator, which autonomously runs `/build`, `/test`,
`/review` on workers in isolated git worktrees, handles CI failures and
review comments, and auto-merges when approved and green.

For the full workflow, see `.claude-plugin/CLAUDE.md`.

## Requirements

- Claude Code
- Agent Orchestrator (`npm i -g @composio/ao`) for autonomous execution
- `linear` CLI and `LINEAR_API_KEY` env var for Linear integration

## License

MIT
