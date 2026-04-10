---
name: plan
description: Refine product requirements for a work item. Writes plan.md to the stream directory. Handles breakdown for high-complexity work by creating child streams.
argument-hint: <stream-id>
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(git *)
---

# /plan

Refine product requirements for a work item. Writes the plan to
`.workflow/streams/{id}/plan.md` in the stream directory.

**This command handles breakdown.** Run `/refine` on sub-items after.

## Context

- Stream metadata: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS meta`
- Existing plan (if any): !`node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS plan`

## Standing Instructions

- Use the requirements-engineer sub-agent only if requirements are
  sparse. Don't invoke it if 3+ maturity checks already pass.
- **For breakdown decisions (when to split and how), read
  `.claude/rules/issue-breakdown.md` first.** That document is the
  authoritative source for complexity heuristics, split dimensions,
  and sub-item requirements. Do not improvise breakdown criteria.
- For high-complexity work (5+ files per the heuristic in
  `issue-breakdown.md`), create child streams and write an epic
  summary to the parent. Do NOT write a full plan to the parent in
  that case.
- `$ARGUMENTS` is the stream ID. All stream.js calls use it
  explicitly. If no stream exists yet, create one first.

## Sizing Heuristic

- Low: 1-2 files
- Medium: 3-4 files
- High: 5+ files (should be broken down into child streams)

## Execution

### Step 0: Ensure stream exists

`$ARGUMENTS` is the stream ID. If no stream exists for this work yet,
create one first:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" create "problem statement"
```

The create command prints the new stream ID to stderr as
`[stream] Created stream N: name`. Use that ID for all subsequent
commands.

Verify the stream exists:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS meta
```

### Step 1: Load past context

Try claude-mem for relevant past work:

```
mcp__claude-mem__search(query="{problem statement from stream}")
mcp__claude-mem__search(query="blockers {problem domain}")
mcp__claude-mem__search(query="decisions {problem domain}")
```

Store results as `{relevant_learnings}`, `{blockers}`, and
`{relevant_decisions}`. If claude-mem is not installed or any query
fails, fall back to empty and log:

```
[scaffold] claude-mem not available, skipping past context lookup
```

### Step 2: Assess requirements maturity

Review the requirements from the stream context (loaded via the
Context block) and any problem statement the user provided.

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
  prompt="Refine requirements for the active work item.

## Work Item Context
{name, description from stream metadata and existing plan content}

## Prior Context
Relevant past learnings: {relevant_learnings from Step 1, or 'None found'}
Known blockers: {blockers from Step 1, or 'None'}

Your job - ADD missing information only:
1. Read relevant codebase docs for context
2. Add acceptance criteria if missing
3. Identify edge cases if not documented
4. Define scope boundaries if unclear
5. Add success metrics if missing
6. Factor in the learnings above for past decisions that constrain this work

IMPORTANT:
- DO NOT change existing factual content (names, lists, specifications)
- If something looks wrong, flag it - do not auto-correct
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

### Step 5: Break down into child streams

Follow the guidance in `.claude/rules/issue-breakdown.md` for the
full breakdown methodology. Key rules from that document:

- **MOVE, don't copy.** Strip detailed implementation from the parent
  and distribute it to child streams. The parent becomes an epic
  summary with only: goal, success criteria, and a list of child
  stream IDs.
- **Vertical slices over horizontal layers.** Split along user-
  visible features, not along BE/FE/DB layers.
- **Each child stream should be Low or Medium** (1-4 files). Never
  create a High-complexity child - break it down further.
- **Happy path first**, edge cases as separate items.
- **Infrastructure** (new tables, new services) gets its own item.

**A. Plan the split:**

List the logical pieces, their dependencies, and the sequencing.
Verify each piece fits the Low/Medium complexity heuristic from
`issue-breakdown.md`.

**B. Create child streams:**

For each sub-item:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" create "{action-oriented title}" --parent $ARGUMENTS
```

The CLI assigns the next child ID automatically (1a, 1b, 1c, etc.).
Track the created child stream IDs from the stderr output.

**C. MOVE content into each child's plan.md:**

For each child stream, use the Write tool to write to
`.workflow/streams/{child_id}/plan.md` with the relevant portion
of the parent's requirements:

```markdown
## Scope
{what this piece does, MOVED from the parent plan}

## Acceptance Criteria
- {criteria specific to this piece}

## Dependencies
{blocking items if any}

## Edge Cases
{relevant edge cases for this piece}
```

This is a MOVE, not a copy. The content you write here should be
removed from the parent in the next step.

**D. Rewrite the parent's plan.md as an epic summary:**

Use the Write tool to rewrite `.workflow/streams/$ARGUMENTS/plan.md`
with only:

- High-level goal and context
- Success criteria for the whole feature
- A list of all child streams with their IDs and titles

All detailed requirements, acceptance criteria, and edge cases
should now live in the children. The parent is a summary only.

Skip Step 6 for the parent. Recommend running `/refine` on each
child stream instead.

### Step 6: Write plan.md

Use the Write tool to write to `.workflow/streams/{id}/plan.md`
(where `{id}` is `$ARGUMENTS`) with
the following structure:

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

If the stream already had content in plan.md (from a previous run),
overwrite it. The latest plan is the canonical plan.

### Step 7: Summarize

Report to the user:

- Requirements maturity assessment
- If requirements were added: what was added
- If broken down: child stream IDs and titles
- Plan written to `.workflow/streams/{id}/plan.md`
- Recommend: "Run `/design` for frontend work, then `/refine` for
  technical planning"
