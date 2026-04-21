---
name: setup-local
description: Install file-backed SDLC workflow templates into the current project. Run once per project.
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(ls *)
---

# /setup-local

Install the sdlc-local plugin's templates into the current project.

## What this does

Runs the setup script, which copies template files into the project:

- `.claude/commands/` -- 8 workflow commands (plan, design, refine,
  build, test, review, audit, customize)
- `.claude/rules/` -- 6 rules files (quality-bar, tests,
  error_handling, context7-lookup, git-workflow, issue-breakdown)
- `.claude/settings.json` -- project plugin settings
- `.workflow/` -- stream state directory (created if missing)
- `.workflow/bin/stream.js` -- stream management CLI
  (overwritten on each run to pick up plugin updates)
- Project root -- `CLAUDE.md` scaffold

Template files are copied **idempotently** -- existing files are
never overwritten. Re-running `/setup-local` is safe and will only
copy templates that are missing. `stream.js` is the exception: it
is always overwritten, because it's internal tooling and users
shouldn't edit it.

## Execution

Run the setup script from the plugin directory:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.js"
```

The script reads `CLAUDE_PROJECT_DIR` from the environment (or falls
back to the current working directory) and copies all templates into
that directory.

The script writes its output to stderr. Each copied file produces a
line like:

```
[setup] Copied template: plan.md -> /path/to/project/.claude/commands
```

Report to the user:

- Count of files copied (from the stderr output)
- Count of files skipped (missing from stderr output -- they already
  existed)
- Any errors

## Next steps

After templates are copied, tell the user:

1. **Review the copied files** to confirm they match expectations.
   Look in `.claude/commands/`, `.claude/rules/`, and the project root.
2. **Run `/customize`** to populate stack-specific CUSTOMIZE markers
   (routing tables, pre-commit hooks, agent plugins).

## Notes

- `/setup-local` is manual. The plugin does NOT install templates
  automatically on session start.
- Safe to run multiple times. Existing files are preserved.
- The setup script has zero external dependencies beyond Node's
  built-in `node:fs` and `node:path` modules.
- For the full workflow overview, see `.claude-plugin/CLAUDE.md` in
  the plugin directory.
