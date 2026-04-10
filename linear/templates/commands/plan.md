---
name: plan
description: Refine product requirements for a Linear issue. Writes the canonical Plan section to the issue description. Handles breakdown for high-complexity work by creating Linear sub-issues.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *)
---

# /plan

Refine product requirements for a Linear issue. Writes the canonical
Plan section to the Linear issue description, preserving any existing
sections owned by other commands.

**This command handles breakdown.** Run `/refine` on sub-items after.

## Context

- Issue: !`linear issue view $ARGUMENTS`

## Standing Instructions

- Never overwrite sections owned by other commands (`## Design`,
  `## Technical Spec`). Only touch `## Plan` and `## Original Request`.
- Preserve unstructured user text from the original issue as
  `## Original Request` at the top of the description.
- Use the requirements-engineer sub-agent only if requirements are
  sparse. Don't invoke it if 3+ maturity checks already pass.
- **For breakdown decisions (when to split and how), read
  `.claude/rules/issue-breakdown.md` first.** That document is the
  authoritative source for complexity heuristics, split dimensions,
  required labels, and sub-issue requirements. Do not improvise
  breakdown criteria.
- For high-complexity work (5+ files per the heuristic in
  `issue-breakdown.md`), create Linear sub-issues and update the
  parent to an Epic summary. Do NOT write a full Plan to the parent
  in that case.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one issue before moving to the next.

## Sizing Heuristic

- Low: 1-2 files
- Medium: 3-4 files
- High: 5+ files (should be broken down into sub-issues)

## Execution

### Step 1: Load past context

Try claude-mem for relevant past work:

```
mcp__claude-mem__search(query="{problem statement from issue}")
mcp__claude-mem__search(query="blockers {issue domain}")
mcp__claude-mem__search(query="decisions {issue domain}")
```

Store results as `{relevant_learnings}`, `{blockers}`, and
`{relevant_decisions}`. If claude-mem is not installed or any query
fails, fall back to empty and log:

```
[scaffold] claude-mem not available, skipping past context lookup
```

### Step 2: Assess requirements maturity

Review the requirements from the issue description (already loaded
via the Context block).

Check if requirements already have:

- [ ] Acceptance criteria
- [ ] Edge cases documented
- [ ] Scope boundaries (in/out of scope)
- [ ] Success metrics

**If 3+ exist**: Skip Step 3, go directly to Step 4.

**If sparse**: Run Step 3.

### Step 3: Run requirements-engineer (only if needed)

```
Task(
  subagent_type="ai-pm-copilot:requirements-engineer",
  prompt="Refine requirements for $ARGUMENTS.

## Linear Issue Context
{title, description, labels from the Context block}

## Prior Context
Relevant past learnings: {relevant_learnings from Step 1, or 'None found'}
Known blockers: {blockers from Step 1, or 'None'}

Your job — ADD missing information only:
1. Read relevant codebase docs for context
2. Add acceptance criteria if missing
3. Identify edge cases if not documented
4. Define scope boundaries if unclear
5. Add success metrics if missing
6. Factor in the learnings above for past decisions that constrain this work

IMPORTANT:
- DO NOT change existing factual content (names, lists, specifications)
- If something looks wrong, flag it — do not auto-correct
- ADD information, do not rewrite what exists

Return the FULL updated requirements (existing content + your additions).
Do NOT implement anything."
)
```

### Step 4: Assess breakdown need

**Read `.claude/rules/issue-breakdown.md` first.** It is the
authoritative source for breakdown criteria. Use its Complexity
Heuristic (Low 1-2 files, Medium 3-4, High 5+) to decide whether
this work needs breakdown.

High complexity (5+ files) MUST be broken down. Also break down if
any of the following apply, per `issue-breakdown.md`:

- Multiple distinct components or features
- Cross-cutting concerns (FE + BE + DB)
- Multiple independent work streams that can proceed in parallel

**If breakdown needed**: Continue to Step 5.
**If NOT needed**: Skip to Step 6.

### Step 5: Break down into sub-issues

Follow the guidance in `.claude/rules/issue-breakdown.md` for the
full breakdown methodology. Key rules from that document:

- **MOVE, don't copy.** Strip detailed implementation from the parent
  and distribute it to sub-issues. The parent becomes an Epic summary
  with only: goal, success criteria, and a list of sub-issue IDs.
- **Vertical slices over horizontal layers.** Split along user-
  visible features, not along BE/FE/DB layers.
- **Each sub-issue should be Low or Medium** (1-4 files). Never
  create a High-complexity sub-issue — break it down further.
- **Happy path first**, edge cases as separate issues.
- **Infrastructure** (new tables, new services) gets its own issue.
- **Every sub-issue needs all 4 label categories**: Type, Scope,
  Complexity, Version.
- **Add the `Type | Epic` label to the parent** after breakdown.

**A. Plan the split:**

List the logical pieces, their dependencies, and the sequencing.
Verify each piece fits the Low/Medium complexity heuristic from
`issue-breakdown.md`.

**B. Create sub-issues in Linear:**

For each sub-item:

```bash
linear issue create \
  --parent $ARGUMENTS \
  --title "{action-oriented title}" \
  --label "{Type}" \
  --label "{Low | Medium}" \
  --description "## Scope
{what this piece does}

## Acceptance Criteria
- {criteria}

## Dependencies
{blocking items if any}

## Edge Cases
{relevant edge cases}"
```

Track the created sub-issue IDs.

**C. Update the parent to an Epic summary:**

For the parent issue, overwrite the description with only:

- High-level goal and context
- Success criteria for the whole feature
- A list of all sub-issues with their IDs and titles

Skip Step 6 for the parent. Recommend running `/refine` on each
sub-issue instead.

### Step 6: Merge the Plan section into the description

Parse the current description (from the Context block) into sections.
Existing sections may include any subset of:

- `## Original Request` — preserved user text
- `## Plan` — owned by this command
- `## Design` — owned by `/design`
- `## Technical Spec` — owned by `/refine`

Plus any unstructured text that should be preserved as Original Request.

**Build the new Plan section:**

```markdown
## Plan

### Problem Statement
{what pain point this solves}

### User Journeys
{step-by-step flows}

### Success Criteria
{measurable outcomes}

### Out of Scope
{explicit boundaries}

### Acceptance Criteria
- {criterion 1}
- {criterion 2}

### Open Questions
{items requiring human input}
```

**Assemble the full new description** in canonical section order:

1. `## Original Request` (preserved unstructured text, if any)
2. The new `## Plan` section (from above)
3. `## Design` (preserved if exists)
4. `## Technical Spec` (preserved if exists)

If the current description has unstructured content (no `##` headings
at all, just free text), preserve it as `## Original Request` at the
top of the new description.

**Write the updated description:**

```bash
linear issue edit $ARGUMENTS --description "{full_content}"
```

### Step 7: Summarize and mark complete

Report to the user:

- Requirements maturity assessment
- If requirements were added: what was added
- If broken down: sub-issue IDs and titles
- Plan written to the Linear issue description
- Recommend: "Run `/design` for frontend work, then `/refine` for
  technical planning"

Append a step-completion marker comment:

```bash
linear issue comment add $ARGUMENTS --body "[plan-done] Planning complete. $(date +%Y-%m-%d)"
```

Keep this comment short. The canonical plan lives in the description,
not in the comment.
