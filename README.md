# SDLC Workflow

Claude Code plugin that enforces spec-driven development
through a strict, phase-gated SDLC workflow.

## About

SDLC works. That's why we use it in human-led development. AI-led
development needs its structure even more.

The core ideas:

**Spec-driven development produces better code.** When you give an AI
agent a detailed spec instead of a vague prompt, it doesn't have to
guess at thousands of unstated requirements. The result is cleaner
code, fewer bugs, less time debugging, and more maintainable products.
This isn't opinion -- it's backed by
[Anthropic's own best practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-code-best-practices),
[GitHub's spec-driven development toolkit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/),
and [research showing a 62% drop in bug rates](https://www.softensity.com/blog/ai-in-the-sdlc-how-one-experiment-revealed-the-future-of-software-development/)
with structured approaches.

**Expert agents beat the general-purpose agent.** This workflow routes
work to specialized sub-agents (security auditors, database architects,
performance engineers, language-specific pros) instead of relying on
Claude Code's general agent for everything. Specialists produce better
code in their domain.

**Phase gates prevent skipping steps.** You can't write a spec without
a plan. You can't build a frontend without a design. You can't build
without a spec. The workflow enforces this because the whole point is
to eliminate the "just vibe it out" approach that produces AI slop.
Plan, refine, build, test, review, deploy.

This is my effort to help eliminate AI slop from the world and help
you ship better products in the process.

| Plugin | State backend | Requirements |
|---|---|---|
| **sdlc-linear** | Linear issue descriptions and comments | Linear CLI, `LINEAR_API_KEY` |
| **sdlc-local** | Markdown files in `.workflow/streams/` | Node.js only |

## Installation

Run each command in the Claude Code prompt.

### Step 1: Install marketplaces

```
/plugin marketplace add https://github.com/slgoodrich/sdlc-workflow
/plugin marketplace add https://github.com/slgoodrich/agents
/plugin marketplace add https://github.com/wshobson/agents
```

### Step 2: Restart Claude Code

Close and reopen Claude Code so the new marketplaces are loaded.

### Step 3: Install a plugin

Pick the plugin that fits your project:

```
/plugin install sdlc-linear@sdlc-workflow
```

or

```
/plugin install sdlc-local@sdlc-workflow
```

### Step 4: Run /bootstrap

```
/bootstrap
```

This automatically:
1. Installs every plugin from the agent marketplaces (slgoodrich/agents, wshobson/agents)
2. Installs required official plugins (`commit-commands`, `pr-review-toolkit`, `context7`)
3. Configures `~/.claude/settings.json` -- disables stack-specific
   plugins globally (they get enabled per-project by `/customize`)

### Step 5: Install MCP servers (optional, recommended)

These provide code graph tracing and cross-session memory. The
workflow commands use them when available and skip them gracefully
when not.

**codebase-memory-mcp** -- indexes your codebase into a queryable
graph. `/build` uses it to understand file dependencies before
modifying code.

Add to your `.mcp.json` (project-level) or global MCP config:

```json
{
  "mcpServers": {
    "codebase-memory-mcp": {
      "command": "npx",
      "args": ["-y", "@deusdata/codebase-memory-mcp"]
    }
  }
}
```

**claude-mem** -- persistent cross-session memory. `/build` queries
it for past patterns and known blockers before implementing.

```
/plugin marketplace add https://github.com/thedotmack/claude-mem
/plugin install claude-mem@thedotmack
```

### Step 6: Install Linear CLI (sdlc-linear only)

Skip this if you installed sdlc-local.

```bash
npm install -D @schpet/linear-cli
```

Set your API key in your shell profile (`~/.bashrc`, `~/.zshrc`):

```bash
export LINEAR_API_KEY="lin_api_..."
```

Get a key at https://linear.app/settings/account/security

### Step 7: Set up your project

Open Claude Code in the project you want to use the workflow in.

```
/setup-linear    # or /setup-local
/customize
```

`/setup-*` copies workflow templates into your project's `.claude/`
directory. `/customize` detects your stack and configures everything:
agent routing, rules files, plugin enablement, and Linear CLI skill
(sdlc-linear only).

## Workflow

**Manual phases** (run in a regular Claude Code session):

1. `/plan` -- refine requirements
2. `/design` -- UX specification
3. `/refine` -- technical spec and task breakdown

**Build phases**:

4. `/build` -- implement from the spec
5. `/test` -- write and run tests, open PR
6. `/review` -- code review, auto-merge on green

**Standalone**:

- `/audit` -- read-only codebase audit
- `/customize` -- re-run if you change your stack or add new agents

## Rules

Both plugins ship 6 rules files to `.claude/rules/` that Claude Code
reads automatically in every session. They set project-wide standards
so the agents don't have to be told twice:

| Rule | What it enforces |
|------|-----------------|
| `quality-bar.md` | Complexity limits, coupling checks, naming, error handling, performance awareness |
| `tests.md` | Test framework, coverage targets, what to test, file structure |
| `error_handling.md` | Idiomatic error patterns, resource cleanup, boundary validation |
| `git-workflow.md` | Branch naming, commit conventions, pre-commit hooks |
| `context7-lookup.md` | When to query library docs, framework IDs, APIs to never hallucinate |
| `issue-breakdown.md` | Work item sizing, complexity heuristics, parent/sub-item structure |

These files ship with `<!-- CUSTOMIZE -->` markers. `/customize`
replaces them with project-specific content based on your detected
stack.

## Dependencies

| Dependency | Used by | Required? |
|-----------|---------|-----------|
| [slgoodrich/agents](https://github.com/slgoodrich/agents) | `/plan` (requirements, prioritization) | Yes |
| [wshobson/agents](https://github.com/wshobson/agents) | `/design`, `/refine`, `/build`, `/test`, `/review` | Yes |
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | `/build`, `/review` (code graph, call tracing) | No |
| [claude-mem](https://github.com/thedotmack/claude-mem) | `/build`, `/plan`, `/refine` (cross-session memory) | No |
| [linear-cli](https://github.com/schpet/linear-cli) | All sdlc-linear commands | sdlc-linear only |
| `commit-commands` | Commit workflow | Yes |
| `pr-review-toolkit` | `/review` | Yes |
| `context7` | `/customize`, doc lookup | Yes |

## Security

I highly recommend [betterleaks](https://github.com/betterleaks/betterleaks)
for all projects. It prevents secrets from being committed to your
repository.

## License

MIT
