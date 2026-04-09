---
name: review
description: Fresh-context code review against the Technical Spec. Writes a verdict comment and auto-merges the PR on APPROVE.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *) Bash(gh *) Bash(rm *)
---

# /review

Fresh-context code review of the current changes. Auto-merges the PR
on APPROVE.

## Purpose

Spawn a fresh review agent WITHOUT implementation context to verify
code quality AND requirements. The reviewer sees the diff, project
conventions, and what the code SHOULD achieve (the Plan + Technical
Spec sections), but NOT how or why it was built.

## Context

- Issue: !`linear issue view $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace -->`
- PR state: !`gh pr view --json state,number,url 2>/dev/null || echo "no-pr"`

## Standing Instructions

- Read requirements ONLY from the `## Plan` and `## Technical Spec`
  sections of the description.
- Do NOT read any build-related data. Fresh-context reviewer must
  evaluate code independently of the implementer's rationale.
- Auto-merge only on APPROVE verdict AND when a PR exists.
- Use `gh pr diff` when a PR exists, else `git diff`. The Context
  block PR state tells you which.
- The post-merge CUSTOMIZE block in Step 5.E runs project-specific
  commands (migrations, deploys). `/customize` fills this per project.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one issue before moving to the next.

ultrathink

## Execution

### Step 1: Generate diff file

Use the PR state from the Context block to choose the diff source.

**If a PR exists** (Context block shows a PR number):

```bash
DIFF_FILE="/tmp/scaffold-review-$(date +%s)-$ARGUMENTS.diff"
gh pr diff > "$DIFF_FILE"
```

**If no PR exists** (Context block shows "no-pr"):

```bash
DIFF_FILE="/tmp/scaffold-review-$(date +%s)-$ARGUMENTS.diff"
git diff > "$DIFF_FILE"
```

If the diff file is empty, stop and tell the user there's nothing to
review. Store the path as `{diff_file}`.

### Step 1.5: Load review context

From the Context block's issue view, extract:

- **Acceptance criteria**: `## Plan > ### Acceptance Criteria` (if
  present)
- **Technical Spec**: `## Technical Spec` (required for a full review)

If the Technical Spec section is missing, a code-quality-only review
is still possible, but flag it in the output.

Do NOT parse any build-related data. The reviewer evaluates code
independently.

**Past decisions and patterns**: try claude-mem:

```
mcp__claude-mem__search(query="review findings {technical area}")
mcp__claude-mem__search(query="decisions {technical area}")
```

Store as `{relevant_learnings}` and `{relevant_decisions}`. If
claude-mem is not installed or any query fails, fall back to empty
and log:

```
[scaffold] claude-mem not available, skipping past review context
```

### Step 2: Spawn fresh review agent

```
Task(
  subagent_type="pr-review-toolkit:code-reviewer",
  model="sonnet",
  prompt="# Code Review

Review the code changes with fresh eyes. You have NO context about why
these changes were made.

## Changes to Review

The diff is saved at: {diff_file}

Use the Read tool to load the full diff before starting your review.

## Requirements (from the Technical Spec section)

{inlined acceptance criteria and file expectations from the description's ## Technical Spec section, or 'No spec available - review code quality only' if empty}

## Architectural Decisions

{relevant_decisions from claude-mem, or 'None' if empty}

## Relevant Past Findings

{relevant_learnings from claude-mem, or 'None found' if empty}

## Review Instructions

Read these files before starting your review:
- `rules/quality-bar.md` - code quality standards and prohibited patterns
- `rules/error_handling.md` - error handling patterns and requirements
- `rules/tests.md` - testing standards
- `CLAUDE.md` - project conventions

Check:

### 1. Requirements Verification
- Does the implementation satisfy the acceptance criteria from the spec?
- Are all files listed in the spec accounted for in the diff?
- Does the implementation match the architectural decisions above?
- Any requirements missed or only partially implemented?

### 2. Code Quality
- Does it follow the decision gates in `rules/quality-bar.md`?
- Any prohibited patterns present?
- Does it match existing codebase conventions from CLAUDE.md?
- Does it follow the established patterns above?

### 3. Security
- Proper validation at system boundaries?
- Secrets/credentials exposed?
- Unsafe operations?

### 4. Error Handling
- Does error handling follow `rules/error_handling.md`?
- Are errors helpful (what failed, why, how to fix)?
- Resource cleanup on error paths?

## Output Format

**VERDICT**: [APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION]

**SUMMARY**: {one sentence summary}

**REQUIREMENTS CHECK**:
- [ ] {acceptance criterion 1}: MET / NOT MET / PARTIAL
- [ ] {acceptance criterion 2}: MET / NOT MET / PARTIAL
(If no spec available, omit this section)

**FINDINGS**:

| Severity | File | Line | Issue |
|----------|------|------|-------|
| BLOCKER/WARNING/NIT | path/to/file | 42 | Description |

**BLOCKERS** (must fix):
- {list or 'None'}

**WARNINGS** (should fix):
- {list or 'None'}

**NITS** (optional):
- {list or 'None'}
"
)
```

### Step 3: Process results and fix

**APPROVE**: Continue to Step 3.5, then Step 5 (auto-merge).

**REQUEST_CHANGES**: Fix all blockers, re-run the review. After 3
total attempts, escalate to the user.

**NEEDS_DISCUSSION**: Surface concerns to the user and wait for a
decision.

### Step 3.5: Append review findings as a tagged comment

Build the comment body, beginning with the `[review]` tag on its own
line followed by a blank line:

```
[review]

**Verdict**: {VERDICT}
**Summary**: {summary}

## Requirements Check

- [ ] {criterion 1}: MET / NOT MET / PARTIAL
- [ ] {criterion 2}: MET / NOT MET / PARTIAL

## Findings

| Severity | File | Line | Issue |
|----------|------|------|-------|
| {rows} |

**Blockers** ({count}): {list or 'None'}
**Warnings** ({count}): {list or 'None'}
**Nits** ({count}): {list or 'None'}
```

Append it to the Linear issue:

```bash
linear issue comment add $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --body "{body}"
```

### Step 4: Cleanup diff file

```bash
rm "$DIFF_FILE" || true
```

### Step 5: Auto-merge on APPROVE

Only run this step if:

- VERDICT was APPROVE, AND
- A PR exists for the current branch (Context block shows a PR
  number)

If either condition is false, skip to Step 6.

**A. Enable auto-merge:**

```bash
gh pr merge --auto --squash
```

**B. Wait for CI and confirm merge:**

```bash
PR_NUMBER=$(gh pr view --json number -q .number)
gh pr checks "$PR_NUMBER" --watch
```

**C. Verify the PR actually merged:**

```bash
gh pr view --json state,mergedAt
```

If `state` is not `MERGED`, investigate. Auto-merge may be blocked by
a branch protection rule or merge conflict. Report to the user and
stop.

**D. Return to the default branch and clean up:**

```bash
git checkout main && git pull
git branch -D feature/$ARGUMENTS
```

**E. Project-specific post-merge commands:**

<!-- CUSTOMIZE: project-specific post-merge commands (e.g., supabase db push, deploy migrations) -->

**F. Update Linear to Done:**

```bash
linear issue update $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --state Done
linear issue comment add $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --body "Review passed. PR merged to main."
```

### Step 6: Report to the user

- Verdict and count of findings by severity
- Blockers addressed (if any)
- PR merge status (if auto-merge ran)
- Linear issue state (Done if merged, otherwise unchanged)

## Severity Definitions

| Severity | Meaning | Action |
|----------|---------|--------|
| BLOCKER | Will cause bugs, security issues, or breaks requirements | Must fix |
| WARNING | Code smell, potential issue, or missing best practice | Should fix |
| NIT | Style preference, minor improvement | Optional |

## Notes

- Uses `model: "sonnet"` for cost-effective reviews
- Fresh context is key — don't pollute with implementation rationale
- Reviews both code quality AND requirements verification
- Build-related data is intentionally excluded to avoid confirmation
  bias
- When a PR exists, reviews operate on `gh pr diff` (excludes
  upstream merges); otherwise on `git diff` (local uncommitted
  changes)
- Auto-merge only fires on APPROVE AND when a PR exists
- Post-merge commands (e.g., database migrations) live in the
  CUSTOMIZE block in Step 5.E — populated by `/customize` per project
- Extended thinking is enabled via `ultrathink` above
