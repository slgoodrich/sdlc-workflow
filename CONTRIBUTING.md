# Contributing

Thanks for your interest in contributing to SDLC Workflow.

## How to contribute

1. Fork the repo
2. Create a branch from `main`
3. Make your changes
4. Open a pull request

## What to contribute

- Bug fixes in command templates or stream.js
- New rules files that enforce code quality standards
- Improvements to existing workflow commands
- Documentation fixes

## What not to contribute

- Changes that weaken phase gates (the strict ordering is intentional)
- New workflow phases without discussion first
- Dependencies on external services (keep sdlc-local self-contained)

## Structure

```
linear/     # sdlc-linear plugin (Linear-backed)
local/      # sdlc-local plugin (file-backed)
```

Each plugin has its own `commands/`, `scripts/`, and `templates/`
directories. Changes to shared rules files should be applied to both
plugins.

## Testing your changes

1. Install your fork as a marketplace:
   ```
   /plugin marketplace add https://github.com/YOUR_USERNAME/sdlc-workflow
   ```
2. Install the plugin you modified
3. Run `/setup-linear` or `/setup-local` in a test project
4. Run `/customize` and verify templates populate correctly
5. Run through the workflow: `/plan`, `/refine`, `/build`, `/test`, `/review`

## Commit conventions

Use conventional commits:

- `feat:` new functionality
- `fix:` bug fixes
- `docs:` documentation only
- `refactor:` code changes that don't add features or fix bugs

## Questions

Open an issue if you have questions or want to discuss a larger change
before starting work.
