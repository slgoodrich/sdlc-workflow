---
name: build
description: Execute an approved implementation spec from the stream's spec.md. Implements tasks, commits locally. No push.
argument-hint: <stream-id>
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(git *)
---

# /build

Execute an approved implementation spec.

**Run `/refine` first.** This command executes the technical spec from
the stream's `spec.md` file.

## Prerequisites

- `/refine` has been run (the stream has a `spec.md` with Task
  Breakdown and Files to Modify)

## Context

- Stream metadata: !`node .workflow/bin/stream.js read $ARGUMENTS meta`
- Spec: !`node .workflow/bin/stream.js read $ARGUMENTS spec`
- Current branch: !`git branch --show-current`

## Standing Instructions

- `/build` does NOT write to stream files. The code and commits are
  the output.
- Never modify `plan.md`, `design.md`, or `spec.md` in the stream
  directory. They are read-only from /build's perspective.
- `spec.md` is required. Stop if missing or empty.
- If the spec indicates frontend work (UI components, pages, layouts,
  styling, user-facing changes), `design.md` is also required. Stop
  if it is missing or empty and tell the user to run `/design` first.
- One stream, one build run. Creating a branch from `main` is
  allowed when no feature branch exists yet. Renaming the current
  branch is allowed when the prefix doesn't match (see Step 1).
- If implementation deviates from the spec, STOP and ask the user
  before proceeding. Do NOT rewrite spec.md.
- Do NOT populate the agent selection table in Step 2 below. It is
  filled by `/customize` per project.
- `/test` gets its file scope from `git diff`, not from the stream.
  You do not need to record per-file progress anywhere persistent -
  just execute and commit.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one stream before moving to the next.

## Execution

### Step 1: Load context and verify prerequisites

**Plan context** (optional): read plan.md from the stream.

```bash
node .workflow/bin/stream.js read $ARGUMENTS plan
```

The stream may not have plan content if `/plan` was skipped.

**Design context** (optional): read design.md from the stream.

```bash
node .workflow/bin/stream.js read $ARGUMENTS design
```

Many backend tasks skip `/design`.

**Technical Spec** (required): the spec was already loaded in the
Context block above. Extract:

- `### Task Breakdown`
- `### Files to Modify`
- `### Test Strategy`
- `### Dependencies`
- `### Risks`

If spec.md is missing or empty, stop and tell the user to run
`/refine` first.

**Design check** (frontend work only): if the spec's Files to Modify
or Task Breakdown references frontend files (components, pages,
layouts, styles, views, templates), check that design.md has content:

```bash
node .workflow/bin/stream.js read $ARGUMENTS design
```

If design.md is empty and the work is frontend, stop and tell the user:

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

**Dependency context per file**: for each file listed in the spec's
Files to Modify section, query the code graph:

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

**Branch prefix**: derive the branch prefix from the stream name.
Default prefix is `feat/`. Read the stream metadata to get the stream
name and use it for branch naming.

Store as `{branch_prefix}` (default `feat/`) and `{commit_prefix}`
(default `feat`).

Check the current branch name (from the Context block). Expected
form: `{prefix}{stream-name-slugified}`. If the prefix doesn't match
the derived `{branch_prefix}`, rename the branch:

```bash
git branch -m "{branch_prefix}{stream-name-slugified}"
```

If the current branch is already correct, do nothing.

If the current branch is `main` (or the project's default branch),
create the feature branch and switch to it:

```bash
git checkout -b "{branch_prefix}{stream-name-slugified}"
```

### Step 2: Select agent

<!-- CUSTOMIZE: Run /customize to populate this table -->
| Type | Agent | Signals |
|------|-------|---------|

### Step 3: Execute plan with checkpoints

For each task in the spec's Task Breakdown:

1. **Announce**: "Starting task N: {description}"

2. **Implement** using the selected agent:

   ```
   Task(
     subagent_type="{detected-agent}",
     prompt="Implement task N for stream $ARGUMENTS.

   Task: {task description from the spec's Task Breakdown}

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
- If implementation deviates from the spec, STOP and ask the user
  before proceeding. Do NOT rewrite spec.md.
- Do NOT write to the stream directory during task execution. The
  code and commits are the output.

### Step 4: Sync with main and commit

Merge main into the feature branch before committing. This catches
conflicts while the build agent still has full implementation context
loaded - if a conflict hits a file it just wrote, it can resolve with
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

stream-$ARGUMENTS"
```

Use `{commit_prefix}` from Step 1 (default `feat`). This matches the
branch prefix so the commit type stays consistent.

Use a single conventional commit covering the full implementation. If
the scope of changes warrants multiple commits, split logically - in
that case, individual commits can use different type prefixes
(`test:` for test-only commits, `docs:` for doc-only commits) as long
as the primary commit uses `{commit_prefix}`.

**Note**: `/build` commits locally but does NOT push. Pushing the
branch and opening the PR is `/test`'s responsibility (after tests
are written and passing).

### Step 5: Summarize

Report to the user:

- Tasks completed (from the spec's Task Breakdown)
- Files modified (from `git status` / `git diff`)
- Commits made
- Suggest next steps: `/test`, `/review`

## Error Handling

- **Spec not found**: stop, tell user to run `/refine`
- **Ambiguous scope**: ask user to clarify
- **Deviation from spec**: stop, ask user for approval, do not
  rewrite spec.md

## Notes

- `/build` focuses on implementation only
- Run `/test` and `/review` separately after `/build` completes
- `/build` writes nothing to the stream directory - the code and
  commits are the output
- `/test` reads its file scope from `git diff`, not from the stream
