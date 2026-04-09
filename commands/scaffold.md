---
name: scaffold
description: Install scaffold templates into the current project. Run once per project when adopting the scaffold workflow.
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(ls *)
---

# /scaffold

Install the scaffold plugin's templates into the current project.

## What this does

Runs the scaffold setup script, which copies template files into the
project:

- `.claude/commands/` — 8 workflow commands (plan, design, refine,
  build, test, review, audit, customize)
- `.claude/rules/` — 7 rules files (quality-bar, tests,
  error_handling, context7-lookup, git-workflow, issue-breakdown,
  self-running-architecture)
- `.ao/` — worker-rules.md for Agent Orchestrator
- Project root — `agent-orchestrator.yaml`, `CLAUDE.md`, and
  `.linear.toml` scaffolds

The copy is **idempotent**. Existing files are never overwritten.
Re-running `/scaffold` is safe and will only copy files that are
missing.

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
[scaffold] Copied template: plan.md -> /path/to/project/.claude/commands
```

Report to the user:

- Count of files copied (from the stderr output)
- Count of files skipped (missing from stderr output — they already
  existed)
- Any errors

## Next steps

After templates are copied, tell the user:

1. **Review the copied files** to confirm they match expectations.
   Look in `.claude/commands/`, `.claude/rules/`, `.ao/`, and the
   project root.
2. **Run `/customize`** to populate stack-specific CUSTOMIZE markers
   (routing tables, AO config, Linear CLI skill, pre-commit hooks).
3. **Run `ao start`** to launch the Agent Orchestrator dashboard if
   you want autonomous build/test/review.

## Notes

- `/scaffold` is manual. The plugin does NOT install templates
  automatically on session start.
- Safe to run multiple times. Existing files are preserved.
- The setup script has zero external dependencies beyond Node's
  built-in `node:fs` and `node:path` modules.
- For the full workflow overview, see `.claude-plugin/CLAUDE.md` in
  the plugin directory.
