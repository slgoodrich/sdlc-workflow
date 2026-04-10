---
name: bootstrap
description: Install all required plugins and configure global settings for the SDLC workflow. Run once after adding the agent marketplaces.
allowed-tools: Bash(claude *) Read(*) Edit(*)
---

# /bootstrap

Install all required plugins from configured marketplaces and
configure global `~/.claude/settings.json` for the SDLC workflow.

## Prerequisites

Before running this command, the user must have added the required
marketplaces:

```
/plugin marketplace add https://github.com/slgoodrich/agents
/plugin marketplace add https://github.com/wshobson/agents
```

And restarted Claude Code (or run `/reload-plugins`) so the
marketplace plugin lists are available.

## Execution

### Step 1: Discover available plugins

Run:

```bash
claude plugin list --available --json
```

Parse the JSON output. It has two keys:
- `available` -- array of all plugins across all marketplaces
  (each has `pluginId`, `name`, `marketplaceName`)
- `installed` -- array of already-installed plugins
  (each has `id`, `enabled`)

Build a set of installed plugin IDs from `installed[].id`.

### Step 2: Verify marketplaces are present

Check that the `available` array contains plugins from these
marketplaces:

- `claude-code-workflows` (wshobson/agents)
- `ai-pm-copilot` (slgoodrich/agents)
- `claude-plugins-official`

If `claude-code-workflows` or `ai-pm-copilot` is missing, stop and
tell the user:

```
Missing marketplace: {name}
Run these commands first, then restart Claude Code:

/plugin marketplace add https://github.com/slgoodrich/agents
/plugin marketplace add https://github.com/wshobson/agents
```

### Step 3: Install missing plugins

For each plugin in `available` that is NOT in the installed set,
run:

```bash
claude plugin install {pluginId}
```

Report progress as you go:

```
Installing {pluginId}... done
```

Skip any that are already installed.

Also ensure these specific official plugins are installed:

- `commit-commands@claude-plugins-official`
- `pr-review-toolkit@claude-plugins-official`
- `context7@claude-plugins-official`

### Step 4: Configure global settings

Read `~/.claude/settings.json`. In the `enabledPlugins` object,
set the correct enabled/disabled state for each plugin.

Only modify plugins from these three sources. Do not touch plugins
from any other marketplace the user may have installed.

**slgoodrich/agents (`@ai-pm-copilot`)** -- enable all. These are
not stack-specific.

**claude-plugins-official** -- enable only these three (installed
in Step 3):

- `commit-commands@claude-plugins-official`
- `pr-review-toolkit@claude-plugins-official`
- `context7@claude-plugins-official`

Do not touch other official plugins the user may have installed.

**wshobson/agents (`@claude-code-workflows`)** -- disable all
except these cross-cutting plugins that apply to every project:

- `code-documentation@claude-code-workflows`
- `application-performance@claude-code-workflows`
- `security-scanning@claude-code-workflows`
- `documentation-generation@claude-code-workflows`
- `unit-testing@claude-code-workflows`
- `performance-testing-review@claude-code-workflows`
- `security-compliance@claude-code-workflows`

All other `@claude-code-workflows` plugins are stack-specific and
get enabled per-project by `/customize`.

### Step 5: Report

Tell the user:

```
Bootstrap complete:
- Installed: {N} new plugins
- Skipped: {M} already installed
- Globally enabled: {list of enabled plugins}
- Globally disabled: {count} stack-specific plugins (enabled per-project by /customize)

Next steps:
1. Restart Claude Code (or run /reload-plugins)
2. In your project, run /setup-linear or /setup-local
3. Then run /customize to detect your stack and enable the right agents
```

## Notes

- Safe to re-run. Already-installed plugins are skipped, and
  settings are idempotent.
- This command modifies `~/.claude/settings.json` (global settings).
  It does not touch project-level settings.
- Stack-specific plugins (e.g., `javascript-typescript`,
  `python-development`) are intentionally disabled globally. They
  get enabled in the project's `.claude/settings.json` when you
  run `/customize`.
