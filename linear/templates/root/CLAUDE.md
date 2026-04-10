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

This project uses the `sdlc-linear` plugin for SDLC workflow.

**Manual phases** (run in a regular Claude Code session):

- `/plan <LAN-ID>` — refine requirements
- `/design <LAN-ID>` — UX specification
- `/refine <LAN-ID>` — technical spec

**Build phases**:

- `/build` — implement
- `/test` — write and run tests
- `/review` — review and auto-merge on green

**Standalone commands**:

- `/audit [scope]` — codebase audit (creates Linear issues for findings)
- `/customize` — re-run if stack changes
