# SDLC Local

File-backed SDLC workflow commands for Claude Code projects.

## How It Works

The plugin ships templates but does NOT install them automatically.
Run `/setup-local` to copy template files into the project:

- `.claude/commands/` -- workflow commands (plan, design, refine, build,
  test, review, audit, customize)
- `.claude/rules/` -- code quality, testing, git workflow, error
  handling, issue breakdown, context7 lookup
- `.claude/settings.json` -- project plugin settings
- `.workflow/` -- stream state directory for cross-phase artifacts
- Project root -- `CLAUDE.md` scaffold

The copy is idempotent. Existing files are never overwritten.

After `/setup-local`, run `/customize` to populate stack-specific
bits (routing tables, pre-commit hooks, agent plugins).

## The Workflow

The SDLC workflow uses local markdown files as the source of truth
for cross-phase state. Each work item gets a **stream** -- a numbered
directory under `.workflow/streams/` containing plan.md, design.md,
and spec.md.

**Manual phases** (run by a human in a regular Claude Code session):

1. `/plan <stream-id>` -- Refine requirements. Writes plan.md to the
   stream directory. Breaks high-complexity work into sub-streams
   (1a, 1b, 1c).
2. `/design <stream-id>` -- UX specification. Writes design.md.
3. `/refine <stream-id>` -- Technical spec and task breakdown. Writes
   spec.md.

**Build phases**:

4. `/build <stream-id>` -- Implement from the spec. Creates branch,
   commits code.
5. `/test <stream-id>` -- Write and run tests. Opens PR.
6. `/review <stream-id>` -- Code review. Handles auto-merge on green.

**Standalone commands**:

- `/audit [scope]` -- Read-only codebase audit. Findings written to
  `.workflow/audit-{date}.md`.
- `/customize` -- Detect project stack, populate routing tables.
- `/bootstrap` -- Install all required plugins and configure global
  settings. Run once after adding agent marketplaces.

## Stream CLI

Streams are managed via the CLI at `scripts/stream.js`:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" create "feature name"
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" create "sub-task" --parent 1
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" list
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" archive 1a
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read 1 plan|design|spec|meta
```

Top-level stream IDs are auto-incrementing integers (1, 2, 3).
Child streams use the parent ID + letter suffix (1a, 1b, 1c).
The user always passes the stream ID explicitly to each command.

## Behavior Guidelines

- The phase commands read each other's output via stream files.
  plan.md feeds design.md and refine.md. spec.md feeds build.md.
- When uncertain, stop and ask. Do not guess on architectural decisions.

## Commands Reference

| Command | Purpose | Writes to |
|---|---|---|
| `/plan <stream-id>` | Requirements refinement | `.workflow/streams/{id}/plan.md` |
| `/design <stream-id>` | UX specification | `.workflow/streams/{id}/design.md` |
| `/refine <stream-id>` | Technical spec | `.workflow/streams/{id}/spec.md` |
| `/build <stream-id>` | Implementation | Git commits |
| `/test <stream-id>` | Test writing + running | PR via `gh` |
| `/review <stream-id>` | Code review + merge | Terminal verdict |
| `/audit [scope]` | Codebase audit | `.workflow/audit-{date}.md` |
| `/customize` | Project bootstrap | `.claude/`, root files |
| `/bootstrap` | Install plugins, configure global settings | `~/.claude/settings.json` |
