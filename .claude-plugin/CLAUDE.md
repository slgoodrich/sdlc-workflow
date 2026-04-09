# Scaffold

You have a scaffold system that provides SDLC workflow commands and
bootstraps new projects for the Agent Orchestrator autonomous worker
pipeline.

## How It Works

The plugin ships templates but does NOT install them automatically.
When the user wants to adopt the scaffold workflow in a project, they
run `/scaffold` manually. That command copies template files into the
project:

- `.claude/commands/` — workflow commands (plan, design, refine, build,
  test, review, audit, customize)
- `.claude/rules/` — code quality, testing, git workflow, issue
  breakdown, and architecture rules
- `.ao/` — Agent Orchestrator worker rules
- Project root — `agent-orchestrator.yaml` and `CLAUDE.md` scaffolds

The copy is idempotent. Existing files are never overwritten. Users
can run `/scaffold` multiple times safely.

After `/scaffold`, users run `/customize` to populate stack-specific
bits (routing tables, AO config, Linear CLI skill, pre-commit hooks).

## The Workflow

The SDLC workflow uses Linear issues as the source of truth for
cross-phase state. Each command reads upstream phases from Linear
comments tagged `[plan]`, `[design]`, `[refine]`, `[build]`, `[test]`,
`[review]`.

**Manual phases** (run by a human in a regular Claude Code session):

1. `/plan <issue>` — Refine requirements. Writes to the Linear issue
   description. Breaks high-complexity work into sub-issues.
2. `/design <issue>` — UX specification. Writes as `[design]` comment.
3. `/refine <issue>` — Technical spec and task breakdown. Writes as
   `[refine]` comment.

**Autonomous phases** (run by Agent Orchestrator workers on issues
labeled "Ready to Build"):

4. `/build <issue>` — Implement. Writes progress as `[build]` comments.
5. `/test <issue>` — Write and run tests. Writes as `[test]` comment.
6. `/review <issue>` — Fresh-context code review. Writes verdict as
   `[review]` comment. Handles auto-merge on green.

**Standalone commands**:

- `/audit [scope]` — Read-only codebase audit. Findings become Linear
  issues.
- `/customize` — Detect project stack, populate routing tables, bootstrap
  AO config, set up Linear CLI skill.

## Agent Orchestrator Handoff

For autonomous build/test/review of Linear issues:

1. Run `/customize` once to populate `agent-orchestrator.yaml` with the
   project's repo, Linear team, and stack-specific agent routing.
2. Run `ao start` to launch the orchestrator dashboard.
3. Move a Linear issue to "Ready to Build" — AO spawns a worker in an
   isolated git worktree.
4. The worker reads the Linear issue, implements, opens a PR. AO handles
   CI failures and review comments by routing them back to the worker
   automatically.

## Behavior Guidelines

- The phase commands read each other's output via Linear comment tags.
  Preserve the tagging convention exactly.
- Never move a Linear issue to "Ready to Build" from within a phase
  command. That is a human signal indicating upstream work is complete.
- Use `claude-mem` and `codebase-memory-mcp` MCP tools for context lookup
  when available. Do not use them as durable state stores — Linear owns
  all cross-phase state.
- When uncertain, stop and ask. Do not guess on architectural decisions.

## Commands Reference

| Command | Purpose | Writes to |
|---|---|---|
| `/plan <issue>` | Requirements refinement | Linear issue description |
| `/design <issue>` | UX specification | `[design]` comment |
| `/refine <issue>` | Technical spec | `[refine]` comment |
| `/build <issue>` | Implementation | `[build]` comments |
| `/test <issue>` | Test writing + running | `[test]` comment |
| `/review <issue>` | Code review + merge | `[review]` comment |
| `/audit [scope]` | Codebase audit | New Linear issues per finding |
| `/customize` | Project bootstrap | `.claude/`, `.ao/`, root files |
