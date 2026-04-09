---
name: refine
description: Add technical implementation details and produce the spec. Writes the Technical Spec section to the Linear issue description. Handles breakdown for high-complexity work.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *)
---

# /refine

Add technical implementation details and produce the spec. **Handles
breakdown for high-complexity work.**

## When to Use

- After `/plan` has written the `## Plan` section to the Linear issue
  description (if product planning was needed)
- After `/design` has written the `## Design` section (for frontend
  work)
- Directly, for technical work that doesn't need product planning
- This command reads upstream sections if they exist and produces the
  technical HOW as a `## Technical Spec` section in the description

## Complexity Heuristic

- Low: 1-2 files
- Medium: 3-4 files
- High: 5+ files (should be broken down)

## Agent Routing

<!-- CUSTOMIZE: Run /customize to populate this table -->
| Type | Agent | Signals |
|------|-------|---------|

## Context

- Issue: !`linear issue view $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace -->`

## Standing Instructions

- Never overwrite sections owned by other commands (`## Plan`,
  `## Design`). Only touch `## Technical Spec`.
- `## Plan` is required. Stop and tell the user to run `/plan` first
  if the description lacks a Plan section.
- `## Design` is optional. Backend work may skip `/design`.
- For high-complexity work (5+ files), create Linear sub-issues and
  recommend running `/refine` on each. Do NOT also write a Technical
  Spec to the parent in that case.
- Do NOT populate the Agent Routing table above. It is filled by
  `/customize` per project.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one issue before moving to the next.
- Re-running `/refine` overwrites the existing Technical Spec
  section. The most recent spec is the canonical spec for downstream
  phases.

## Execution

### Step 1: Load context

**Plan context (required)**: Parse the description from the Context
block for `## Plan > ### Problem Statement`, `### Success Criteria`,
and `### Acceptance Criteria`. If the Plan section is missing, stop
and tell the user to run `/plan` first.

**Design context (optional)**: Parse the description for `## Design`.
If present, use it for UX context. If not, continue — `/refine` can
be the entry point for technical work that did not need `/design`.

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

From the Plan section and (optional) Design section, determine:

1. **Scope**: How many files will this touch?
2. **Nature**: What area of the codebase?
3. **Complexity**: Low / Medium / High?

**Decision tree:**

```
Is High complexity (5+ files)?
  -> Go to Step 3 (Technical Breakdown)

Is Low/Medium complexity?
  -> Go to Step 4 (Add Implementation Details)
```

### Step 3: Technical Breakdown (High complexity only)

Break the work into smaller pieces.

**A. Plan the split:**

Group work by:

- Component type (separate concerns)
- Dependency order (what must come first?)
- Logical units (related files that change together)

Target: Each piece should be 1-4 files (Low or Medium complexity).

**B. Create sub-issues in Linear:**

For each piece:

```bash
linear issue create \
  --workspace <!-- CUSTOMIZE: workspace --> \
  --parent $ARGUMENTS \
  --title "{specific action}" \
  --label "{Type}" \
  --label "{Low | Medium}" \
  --description "## Scope
{what this piece changes}

## Files
- path/to/file - {change}

## Acceptance Criteria
- {done criteria}

## Dependencies
{blocking items}"
```

Track the created sub-issue IDs.

**C. Run Step 4 on each sub-issue** (or report and let the user run
`/refine` separately on each).

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

Do NOT implement anything — just return the spec."
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

### Step 5: Merge the Technical Spec section into the description

Parse the current description (from the Context block) into sections.
Existing sections may include any subset of:

- `## Original Request`
- `## Plan` (required, preserved)
- `## Design` (preserved if exists)
- `## Technical Spec` (to be overwritten or inserted)

**Build the new Technical Spec section:**

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

**Assemble the full new description** in canonical section order:

1. `## Original Request` (preserved if exists)
2. `## Plan` (preserved, required)
3. `## Design` (preserved if exists)
4. The new `## Technical Spec` section (from above)

**Write the updated description:**

```bash
linear issue edit $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --description "{full_content}"
```

### Step 6: Summarize

If breakdown occurred:

- List of sub-issues created (IDs and titles)
- Recommend: "Run `/refine` on each sub-issue to add implementation
  details"

If implementation details were added:

- Files identified (count and paths)
- Complexity confirmed
- Spec written to the `## Technical Spec` section of `$ARGUMENTS`
- Recommend: "Run `/build` when ready"

### Step 7: Mark complete

Append a step-completion marker comment:

```bash
linear issue comment add $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --body "[refine-done] Technical spec complete. $(date +%Y-%m-%d)"
```

Keep this comment short. The canonical spec lives in the
description's `## Technical Spec` section.
