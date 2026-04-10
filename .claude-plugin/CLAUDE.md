# SDLC Workflow

This marketplace provides two SDLC workflow plugins for Claude Code.
Both follow the same phase structure (plan, design, refine, build,
test, review) but differ in where cross-phase state is stored.

## Plugins

### sdlc-linear

Linear-backed workflow. Cross-phase state lives in Linear issue
descriptions and comments. Requires Linear CLI and API key.

Install, then run `/setup-linear` in your project.

### sdlc-local

File-backed workflow. Cross-phase state lives in local markdown files
under `.workflow/streams/`. No external dependencies beyond Node.js.

Install, then run `/setup-local` in your project.

## Choosing a plugin

- Use **sdlc-linear** if your team uses Linear for project management
  and you want workflow state tied to issue tracking.
- Use **sdlc-local** if you want a lightweight, self-contained workflow
  with no external service dependencies.

Both plugins can be installed simultaneously. Enable whichever fits
the project via `.claude/settings.json`.
