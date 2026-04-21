---
name: refine
description: Add technical implementation details and produce the spec. Writes spec.md to the stream directory. Handles breakdown for high-complexity work.
argument-hint: <stream-id>
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(git *)
---

# /refine

Add technical implementation details and produce the spec. **Handles
breakdown for high-complexity work.**

## When to Use

- After `/plan` and/or `/design` have written their files (if those
  steps were needed)
- Directly, for simple or technical work that doesn't need upstream
  planning
- This command reads upstream files if they exist and produces the
  technical HOW as `spec.md` in the stream directory

## Complexity Heuristic

- Low: 1-2 files
- Medium: 3-4 files
- High: 5+ files (should be broken down)

## Agent Routing

<!-- CUSTOMIZE: Run /customize to populate this table -->
| Type | Agent | Signals |
|------|-------|---------|

## Context

- Stream metadata: !`node .workflow/bin/stream.js read $ARGUMENTS meta`
- Plan: !`node .workflow/bin/stream.js read $ARGUMENTS plan`
- Design (if exists): !`node .workflow/bin/stream.js read $ARGUMENTS design`
- Existing spec (if any): !`node .workflow/bin/stream.js read $ARGUMENTS spec`

## Standing Instructions

- `plan.md` is not required. If present, use it for context. If
  missing, check whether the user should run `/plan` first:
  - **Skip /plan** (proceed directly): bug fixes, small refactors,
    tech debt with an obvious fix, or any stream where the "what" and
    "why" are already clear from the title and description.
  - **Recommend /plan first**: new features where scope is undefined,
    work with product/UX implications, or streams where the problem
    itself needs clarification.
  Use judgment. If the stream has enough context to write a spec,
  write the spec.
- `design.md` is optional. Backend work may skip `/design`.
- **For breakdown decisions (when to split and how), read
  `.claude/rules/issue-breakdown.md` first.** That document is the
  authoritative source for complexity heuristics, split dimensions,
  and sub-item requirements. Do not improvise breakdown criteria.
- For high-complexity work (5+ files per `issue-breakdown.md`),
  create child streams and recommend running `/refine` on each.
  Do NOT also write a spec to the parent in that case.
- Do NOT populate the Agent Routing table above. It is filled by
  `/customize` per project.
- `$ARGUMENTS` is the stream ID. All stream.js calls use it
  explicitly.
- Re-running `/refine` overwrites the existing spec.md. The most
  recent spec is the canonical spec for downstream phases.

## Execution

### Step 1: Load context

**Plan context**: Parse the plan from the Context block for
`### Problem Statement`, `### Success Criteria`, and
`### Acceptance Criteria`. If plan.md is empty or missing, assess
whether one is needed (see Standing Instructions). If the stream
has enough context to proceed, use the title and metadata instead.

**Design context (optional)**: Check if `design.md` has content. If
present, use it for UX context. If not, continue - `/refine` can be
the entry point for technical work that did not need `/design`.

**Past decisions and patterns**: Try claude-mem:

```
mcp__claude-mem__search(query="decisions {technical area from plan}")
mcp__claude-mem__search(query="patterns {technical area or problem}")
mcp__claude-mem__search(query="{technical area or problem from plan}")
```

Store results as `{relevant_decisions}`, `{relevant_patterns}`, and
`{relevant_learnings}`. If claude-mem is not installed or any query
fails, fall back to empty and log:

```
[scaffold] claude-mem not available, skipping past technical context
```

### Step 2: Assess complexity

**Read `.claude/rules/issue-breakdown.md` first.** Use its Complexity
Heuristic (Low 1-2 files, Medium 3-4, High 5+) to classify this
work.

From the plan (if present), design (if present), or the stream
title and metadata, determine:

1. **Scope**: How many files will this touch?
2. **Nature**: What area of the codebase?
3. **Complexity**: Low / Medium / High (per `issue-breakdown.md`)?

**Decision tree:**

```
Is High complexity (5+ files)?
  -> Go to Step 3 (Technical Breakdown)

Is Low/Medium complexity?
  -> Go to Step 4 (Add Implementation Details)
```

### Step 3: Technical Breakdown (High complexity only)

Follow the guidance in `.claude/rules/issue-breakdown.md` for the
full breakdown methodology. Key rules from that document:

- **MOVE, don't copy.** Move implementation details from the parent
  into child streams. The parent becomes an epic summary.
- **Vertical slices over horizontal layers.** Split along user-
  visible features, not BE/FE/DB boundaries.
- **Each child stream should be Low or Medium** (1-4 files). Never
  create a High-complexity child - break it down further.
- **Happy path first**, edge cases as separate items.
- **Infrastructure** (new tables, new services) gets its own item.

**A. Plan the split:**

Group work by:

- Component type (separate concerns)
- Dependency order (what must come first?)
- Logical units (related files that change together)

Target: Each piece should be 1-4 files (Low or Medium complexity per
`issue-breakdown.md`).

**B. Create child streams:**

For each piece:

```bash
node .workflow/bin/stream.js create "{specific action}" --parent $ARGUMENTS
```

The CLI assigns the next child ID automatically (1a, 1b, 1c, etc.).
Track the created child stream IDs from the stderr output.

**C. MOVE content into each child stream:**

For each child, use the Write tool to write to
`.workflow/streams/{child_id}/plan.md` with the relevant portion
MOVED from the parent:

```markdown
## Scope
{what this piece changes, MOVED from parent}

## Files
- path/to/file - {change}

## Acceptance Criteria
- {done criteria for this piece}

## Dependencies
{blocking items}
```

This is a MOVE, not a copy. Content written to children must be
removed from the parent.

**D. Rewrite the parent's plan.md as an epic summary:**

Use the Write tool to rewrite `.workflow/streams/$ARGUMENTS/plan.md`
with only:

- High-level goal and context
- Success criteria for the whole feature
- A list of all child streams with their IDs and titles

All detailed scope, files, and acceptance criteria should now live
in the children.

**E. Run Step 4 on each child stream** (or report and let the user
run `/refine` separately on each).

### Step 4: Add Implementation Details (Low/Medium complexity)

Run the technical agent to add implementation details:

<!-- CUSTOMIZE: Replace subagent_type with your preferred agent -->
```
Task(
  subagent_type="{detected-agent}",
  prompt="Produce technical implementation details.

## Established Patterns and Decisions
{relevant_patterns and relevant_decisions from claude-mem, or 'None'}

## Relevant Past Work
{relevant_learnings from claude-mem, or 'None found' if empty}

Your job:
1. Check for CLAUDE.md files for project conventions
2. Explore the codebase to find the specific files involved
3. Verify the files exist and understand current implementation
4. Document the specific changes needed (line numbers if helpful)
5. Specify testing approach
6. Note any risks or dependencies
7. Factor in the established patterns and past learnings above

Return a '## Technical Implementation' section containing:
- Exact file paths
- What changes in each file
- Code snippets if helpful (keep brief)
- Test file locations
- Any migration or dependency changes needed

Do NOT implement anything - just return the spec."
)
```

After the agent returns, look up dependency context for each key file
the agent identified:

```
For each file the agent listed:
  Try mcp__codebase-memory-mcp__trace_call_path(
    function_name="{key function in file}",
    depth=1,
    direction="both"
  )

  If codebase-memory-mcp is not installed, fall back to:
    git log --oneline --follow -- {file_path} | head -5
```

Store as `{file_history}`. If any file has notable history (past
decisions, issues, or patterns), append that context to the final
spec.

### Step 5: Write spec.md

Use the Write tool to write to `.workflow/streams/{id}/spec.md`
(where `{id}` is `$ARGUMENTS`) with
the following structure:

```markdown
## Technical Spec

### Task Breakdown
1. {task with clear deliverable}
2. {task with clear deliverable}

### Files to Modify
- path/to/file1 - {what changes}
- path/to/file2 - {what changes}

### Database Changes
{migrations needed, if any}

### Dependencies
{new packages, if any}

### Test Strategy
- {what to test}
- {test file locations}

### Risks
- {potential issues}
- {mitigations}
```

If spec.md already had content (from a previous run), overwrite it.
The latest spec is the canonical spec.

### Step 6: Summarize

If breakdown occurred:

- List of child streams created (IDs and titles)
- Recommend: "Run `/refine` on each child stream to add
  implementation details"

If implementation details were added:

- Files identified (count and paths)
- Complexity confirmed
- Spec written to `.workflow/streams/{id}/spec.md`
- Recommend: "Run `/build` when ready"
