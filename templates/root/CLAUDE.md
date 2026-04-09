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

This project uses the `scaffold` plugin for SDLC workflow and Agent
Orchestrator for autonomous build/test/review.

**Manual phases** (run in a regular Claude Code session):

- `/plan <LAN-ID>` — refine requirements
- `/design <LAN-ID>` — UX specification
- `/refine <LAN-ID>` — technical spec

**Autonomous phases** (AO runs these when you label an issue
"Ready to Build"):

- `/build` — implement
- `/test` — write and run tests
- `/review` — review and auto-merge on green

**Standalone commands**:

- `/audit [scope]` — codebase audit (creates Linear issues for findings)
- `/customize` — re-run if stack changes

## Agent Orchestrator

`agent-orchestrator.yaml` at the project root contains the AO config.
Launch with:

    ao start

The orchestrator dashboard runs at http://localhost:3000.
