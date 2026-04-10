# SDLC Linear

Linear-backed SDLC workflow commands for Claude Code projects.

## How It Works

The plugin ships templates but does NOT install them automatically.
Run `/setup-linear` to copy template files into the project:

- `.claude/commands/` -- workflow commands (plan, design, refine, build,
  test, review, audit, customize)
- `.claude/rules/` -- code quality, testing, git workflow, error
  handling, issue breakdown, context7 lookup
- `.claude/settings.json` -- project plugin settings
- Project root -- `CLAUDE.md` and `.linear.toml` scaffolds

The copy is idempotent. Existing files are never overwritten.

After `/setup-linear`, run `/customize` to populate stack-specific
bits (routing tables, Linear CLI skill, pre-commit hooks, agent
plugins).

## The Workflow

The SDLC workflow uses Linear issues as the source of truth for
cross-phase state. Each command reads and writes to the Linear issue
description.

**Manual phases** (run by a human in a regular Claude Code session):

1. `/plan <issue>` -- Refine requirements. Writes `## Plan` to the
   issue description. Breaks high-complexity work into sub-issues.
2. `/design <issue>` -- UX specification. Writes `## Design` to
   the issue description.
3. `/refine <issue>` -- Technical spec. Writes `## Technical Spec`
   to the issue description.

**Build phases**:

4. `/build <issue>` -- Implement from the spec. Creates branch,
   commits code, writes `[build-done]` comment.
5. `/test <issue>` -- Write and run tests. Opens PR, writes `[test]`
   comment.
6. `/review <issue>` -- Code review. Writes `[review]` comment.
   Handles auto-merge on green.

**Standalone commands**:

- `/audit [scope]` -- Read-only codebase audit. Findings become
  Linear issues.
- `/customize` -- Detect project stack, populate routing tables, set
  up Linear CLI skill.
- `/bootstrap` -- Install all required plugins and configure global
  settings. Run once after adding agent marketplaces.

## Behavior Guidelines

- The manual phase commands write to the issue description sections.
  Build/test/review write tagged comments. Preserve these conventions.
- Never move a Linear issue status from within a phase command unless
  the command explicitly instructs it.
- Use `claude-mem` and `codebase-memory-mcp` MCP tools for context
  lookup when available. Do not use them as durable state stores --
  Linear owns all cross-phase state.
- When uncertain, stop and ask. Do not guess on architectural decisions.

## Commands Reference

| Command | Purpose | Writes to |
|---|---|---|
| `/plan <issue>` | Requirements refinement | `## Plan` in description |
| `/design <issue>` | UX specification | `## Design` in description |
| `/refine <issue>` | Technical spec | `## Technical Spec` in description |
| `/build <issue>` | Implementation | `[build-done]` comment |
| `/test <issue>` | Test writing + running | `[test]` comment, opens PR |
| `/review <issue>` | Code review + merge | `[review]` comment |
| `/audit [scope]` | Codebase audit | New Linear issues per finding |
| `/customize` | Project bootstrap | `.claude/`, root files |
| `/bootstrap` | Install plugins, configure global settings | `~/.claude/settings.json` |
