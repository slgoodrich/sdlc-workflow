---
name: build
description: Execute an approved implementation spec from the Technical Spec section. Implements tasks, commits, and marks complete. No writes to the issue description.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *)
---

# /build

Execute an approved implementation spec.

**Run `/refine` first.** This command executes the technical spec from
the `## Technical Spec` section of the Linear issue description.

## Prerequisites

- `/refine` has been run (the description has a `## Technical Spec`
  section with Task Breakdown and Files to Modify)

## Context

- Issue: !`linear issue view $ARGUMENTS`
- Current branch: !`git branch --show-current`

## Standing Instructions

- `/build` does NOT write body content to the Linear issue
  description. Only a `[build-done]` completion comment at the end.
- Never touch the `## Plan`, `## Design`, or `## Technical Spec`
  sections. They are read-only from /build's perspective.
- `## Technical Spec` is required. Stop if missing.
- If the spec indicates frontend work (UI components, pages, layouts,
  styling, user-facing changes), `## Design` is also required. Stop
  if it is missing and tell the user to run `/design` first.
- One issue, one build run. Creating a branch from `main` is
  allowed when no feature branch exists yet. Renaming the current
  branch is allowed when the prefix doesn't match the Linear
  issue's Type label (see Step 1).
- If implementation deviates from the spec, STOP and ask the user
  before proceeding. Do NOT rewrite the Technical Spec section.
- Do NOT populate the agent selection table in Step 2 below. It is
  filled by `/customize` per project.
- `/test` gets its file scope from `git diff`, not from Linear.
  You do not need to record per-file progress anywhere persistent —
  just execute and commit.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one issue before moving to the next.

## Execution

### Step 1: Load context and verify prerequisites

**Plan context** (optional): parse the description from the Context
block for `## Plan > ### Acceptance Criteria`. The description may
not have a Plan section if `/plan` was skipped.

**Design context** (optional): parse the description for `## Design`.
Many backend tasks skip `/design`.

**Technical Spec** (required): parse the description for
`## Technical Spec`. Extract:

- `### Task Breakdown`
- `### Files to Modify`
- `### Test Strategy`
- `### Dependencies`
- `### Risks`

If the Technical Spec section is missing, stop and tell the user to
run `/refine` first.

**Design check** (frontend work only): if the spec's Files to Modify
or Task Breakdown references frontend files (components, pages,
layouts, styles, views, templates), check that the issue description
has a `## Design` section with content. If it is missing and the work
is frontend, stop and tell the user:

"This build includes frontend changes but no design spec exists.
Run `/design $ARGUMENTS` first to define the UX specification."

**Past patterns, decisions, and similar work**: try claude-mem:

```
mcp__claude-mem__search(query="patterns {technical area from spec}")
mcp__claude-mem__search(query="blockers {technical area}")
mcp__claude-mem__search(query="{task summary from spec}")
```

Store as `{relevant_patterns}`, `{relevant_blockers}`, and
`{relevant_learnings}`. If claude-mem is not installed or any query
fails, fall back to empty and log:

```
[scaffold] claude-mem not available, skipping past build context
```

**Dependency context per file**: for each file listed in the Technical
Spec's Files to Modify section, query the code graph:

```
Try: mcp__codebase-memory-mcp__trace_call_path(
  function_name="{key function in file}",
  depth=1,
  direction="both"
)
```

If codebase-memory-mcp is not installed, fall back to:

```bash
git log --oneline --follow -- {file_path} | head -5
```

Store as `{dependency_context}`. Note any files with significant
history (past bugs, refactors, decisions).

**Branch prefix from Type label**: derive the correct branch and
commit prefix from the Linear issue's Type label (from the Context
block's issue view). Use this mapping:

| Linear Type | Branch prefix | Commit prefix |
|---|---|---|
| `Type \| Feature` | `feat/` | `feat` |
| `Type \| Improvement` | `feat/` | `feat` |
| `Type \| Bug` | `fix/` | `fix` |
| unknown / missing | `feat/` | `feat` (safe fallback) |

Store as `{branch_prefix}` and `{commit_prefix}` for use in later
steps.

Check the current branch name (from the Context block). Expected
form: `{prefix}{ISSUE-ID}`. If the prefix doesn't match the derived
`{branch_prefix}`, rename the branch:

```bash
git branch -m "{branch_prefix}$ARGUMENTS"
```

Example: the branch was created as `feat/LAN-42`, but the Linear
issue is tagged `Type | Bug`. Rename to `fix/LAN-42` before any
commits.

If the current branch is already correct, do nothing.

If the current branch is `main` (or the project's default branch),
create the feature branch and switch to it:

```bash
git checkout -b "{branch_prefix}$ARGUMENTS"
```

### Step 2: Select agent

<!-- CUSTOMIZE: Run /customize to populate this table -->
| Type | Agent | Signals |
|------|-------|---------|

### Step 3: Execute plan with checkpoints

For each task in the Technical Spec's Task Breakdown:

1. **Announce**: "Starting task N: {description}"

2. **Implement** using the selected agent:

   ```
   Task(
     subagent_type="{detected-agent}",
     prompt="Implement task N for $ARGUMENTS.

   Task: {task description from the Technical Spec's Task Breakdown}

   ## Dependencies
   {dependency_context from codebase-memory-mcp for files in this task, or 'None'}

   ## Established Patterns
   {relevant_patterns from claude-mem, or 'None'}

   ## Known Blockers
   {relevant_blockers from claude-mem, or 'None'}

   ## Relevant Past Work
   {relevant_learnings from claude-mem, or 'None found' if empty}

   Your job:
   1. Check for CLAUDE.md files for project conventions
   2. Implement this specific task following the architectural constraints
   3. Follow the established patterns and past learnings above
   4. Do NOT implement other tasks

   Report files created/modified."
   )
   ```

3. **Announce**: "Completed task N."

**During implementation:**

- If uncertain about approach, STOP and ask the user.
- If implementation deviates from the Technical Spec, STOP and ask
  the user before proceeding. Do NOT rewrite the Technical Spec
  section in the description.
- Do NOT write to Linear during task execution. The only Linear
  write is the final `[build-done]` comment in Step 5.

### Step 4: Sync with main and commit

Merge main into the feature branch before committing. This catches
conflicts while the build agent still has full implementation context
loaded — if a conflict hits a file it just wrote, it can resolve with
intent, not archaeology.

```bash
git fetch origin main
git merge origin/main
```

**If conflicts**: Resolve them, preserving the implementation's
correctness. Re-run the project's test suite after resolving to
confirm nothing broke.

**If clean merge (or fast-forward)**: Continue.

Then stage and commit:

```bash
git add -A
git commit -m "{commit_prefix}({scope}): {description}

$ARGUMENTS"
```

Use `{commit_prefix}` from Step 1's Type-label mapping (e.g., `feat`,
`fix`). This matches the branch prefix so the commit type stays
consistent with the issue type.

Use a single conventional commit covering the full implementation. If
the scope of changes warrants multiple commits, split logically — in
that case, individual commits can use different type prefixes
(`test:` for test-only commits, `docs:` for doc-only commits) as long
as the primary commit uses `{commit_prefix}`.

**Note**: `/build` commits locally but does NOT push. Pushing the
branch and opening the PR is `/test`'s responsibility (after tests
are written and passing).

### Step 5: Summarize and mark complete

Report to the user:

- Tasks completed (from the Technical Spec's Task Breakdown)
- Files modified (from `git status` / `git diff`)
- Commits made
- Suggest next steps: `/test`, `/review`

Append a single completion comment to the Linear issue:

```bash
linear issue comment add $ARGUMENTS --body "[build-done] Build complete. $(date +%Y-%m-%d)"
```

The comment is a marker only. `/test` reads the file list from
`git diff`, not from this comment.

## Error Handling

- **Technical Spec not found**: stop, tell user to run `/refine`
- **Ambiguous scope**: ask user to clarify
- **Deviation from spec**: stop, ask user for approval, do not
  rewrite the Technical Spec section

## Notes

- `/build` focuses on implementation only
- Run `/test` and `/review` separately after `/build` completes
- `/build` writes zero body content to Linear — the code and commits
  are the output. A single `[build-done]` comment marks completion.
- `/test` reads its file scope from `git diff`, not from Linear
