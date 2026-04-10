# <!-- CUSTOMIZE: Project Name -->

<!-- CUSTOMIZE: one-paragraph project description -->

## Stack

- **Language**: <!-- CUSTOMIZE -->
- **Framework**: <!-- CUSTOMIZE -->
- **Database**: <!-- CUSTOMIZE -->
- **Test runner**: <!-- CUSTOMIZE -->
- **Package manager**: <!-- CUSTOMIZE -->

## Agents

<!-- CUSTOMIZE: Agent routing table -->
| Agent | Purpose |
|-------|---------|

## Workflow

This project uses the `sdlc-local` plugin for SDLC workflow.
Cross-phase state is stored in `.workflow/streams/`.

**Manual phases** (run in a regular Claude Code session):

- `/plan <stream-id>` -- refine requirements
- `/design <stream-id>` -- UX specification
- `/refine <stream-id>` -- technical spec

**Build phases**:

- `/build <stream-id>` -- implement
- `/test <stream-id>` -- write and run tests
- `/review <stream-id>` -- review and auto-merge on green

**Standalone commands**:

- `/audit [scope]` -- codebase audit
- `/customize` -- re-run if stack changes
