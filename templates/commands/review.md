---
name: review
description: Fresh-context code review with parallel code, security, and performance agents. Writes a verdict comment and auto-merges the PR on APPROVE.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *) Bash(gh *) Bash(rm *)
---

# /review

Fresh-context code review of the current changes. Runs up to three
agents in parallel (code, security, performance) and auto-merges the
PR on APPROVE.

## Purpose

Spawn fresh review agents WITHOUT implementation context to verify
code quality AND requirements. The reviewers see the diff, project
conventions, and what the code SHOULD achieve (the Plan + Technical
Spec sections), but NOT how or why it was built.

## Context

- Issue: !`linear issue view $ARGUMENTS`
- PR state: !`gh pr view --json state,number,url 2>/dev/null || echo "no-pr"`

## Standing Instructions

- Read requirements ONLY from the `## Plan` and `## Technical Spec`
  sections of the description.
- Do NOT read any build-related data. Fresh-context reviewers must
  evaluate code independently of the implementer's rationale.
- Review runs up to three agents in parallel: code reviewer (always),
  security auditor (conditional on touched paths), performance
  reviewer (conditional on touched paths). See Step 3 for the
  dispatch table.
- Blast radius from `codebase-memory-mcp` is always included in agent
  prompts. If the project is indexed, the call succeeds; if not, fall
  back to empty `{blast_radius}`.
- Auto-merge only on APPROVE verdict AND when a PR exists.
- Use `gh pr diff` when a PR exists, else `git diff`. The Context
  block PR state tells you which.
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

### Step 2: Load review context

From the Context block's issue view, extract:

- **Acceptance criteria**: `## Plan > ### Acceptance Criteria` (if
  present)
- **Technical Spec**: `## Technical Spec` (required for a full review)

If the Technical Spec section is missing, a code-quality-only review
is still possible, but flag it in the output.

Do NOT parse any build-related data. The reviewers evaluate code
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

### Step 3: Determine review scope

Identify which files changed, compute blast radius, and decide which
agents to spawn.

**A. Get changed files:**

If a PR exists:

```bash
gh pr diff --name-only
```

Else:

```bash
git diff --name-only
```

Store as `{changed_files}`.

**B. Blast radius from codebase-memory-mcp:**

```
mcp__codebase-memory-mcp__detect_changes(scope="branch")
```

This returns changed functions/classes, their direct callers
(CRITICAL risk), and transitive callers (HIGH/MEDIUM risk). Store
as `{blast_radius}` and inline it into every agent prompt so the
reviewers know which callers might break.

If `codebase-memory-mcp` is not installed or the call fails, fall
back to empty `{blast_radius}` and log:

```
[scaffold] codebase-memory-mcp not available, skipping blast radius
```

**C. Path-based agent dispatch:**

The code reviewer always runs. Security and performance agents are
conditional on whether `{changed_files}` contains any path matching
their trigger rules below.

<!-- CUSTOMIZE: Populate with project-specific security and performance trigger paths -->

| Agent | Trigger paths | Rationale |
|-------|--------------|-----------|
| Code reviewer | Always | Every PR gets code quality review |
| Security auditor | `*config*`, `*auth*`, `*.env*`, dependency manifests, `*webhook*`, `*upload*`, HTTP routes, DB queries | Trust boundaries, input surfaces, dependency changes |
| Performance reviewer | Hot paths specific to this project (data pipelines, batch jobs, DB layer, scraping, heavy loops) | Where scale pain actually appears |

The table above is a placeholder. `/customize` populates it with
stack-specific trigger paths based on detected project structure
during project setup. Until `/customize` runs, the generic rules
above apply.

Store the list of agents that will run as `{review_agents}`.

### Step 4: Spawn review agents

**Always spawn the code reviewer.** Spawn security and performance
agents only if their trigger paths match files in `{changed_files}`.
When multiple agents run, spawn them in parallel (single message,
multiple Task calls) to minimize wall time.

#### Code reviewer (always)

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

## Blast Radius (from code graph)

{blast_radius from detect_changes — changed symbols, direct callers (CRITICAL), transitive callers (HIGH/MEDIUM). Use this to verify callers aren't broken by the changes.}

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

### 3. Security Basics
- Proper validation at system boundaries?
- Secrets/credentials exposed?
- Unsafe operations?

(Deep security review is handled by the security auditor agent when triggered by path rules.)

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

#### Security auditor (conditional)

```
Task(
  subagent_type="security-scanning:security-auditor",
  model="sonnet",
  prompt="# Security Review

Audit the PR diff for security issues. Focus on real vulnerabilities,
not theoretical ones.

## Changes to Review

The diff is saved at: {diff_file}

Use the Read tool to load the full diff before starting your review.

## Blast Radius (from code graph)

{blast_radius from detect_changes}

## Review Instructions

Read `CLAUDE.md` for project conventions and `rules/quality-bar.md`
for code quality standards.

Check these universal concerns:

### 1. Input Validation at System Boundaries
- Are all external inputs (HTTP bodies, query params, headers, file
  uploads, CLI args, config files, scraper responses) validated at
  the boundary with helpful error messages?
- Any injection vectors (SQL, command, path traversal, XSS)?
- Are type guards or schema validators used instead of trusting
  shapes?

### 2. Authentication and Authorization
- Do protected routes check identity before authorization?
- Is the user-to-resource ownership chain verified (not just auth,
  but authz)?
- Any routes or operations that should be protected but aren't?

### 3. Secrets and Configuration
- Any hardcoded secrets, API keys, or credentials?
- Are environment variables used for all sensitive config?
- Any secrets that could leak through error messages, logs, or
  stack traces?
- Are `.env`-style files gitignored?

### 4. Data Exposure
- Do API responses exclude internal fields (IDs, timestamps,
  internal state)?
- Any PII or sensitive data in logs?
- Any user-supplied data reflected without sanitization?

### 5. Resource Safety
- Are database connections, file handles, and network clients
  closed on all error paths?
- Unbounded input loaded into memory?
- Temp files created without cleanup?
- Any new dependencies with known CVEs or abandoned status?

<!-- CUSTOMIZE: Add project-specific security check categories here (e.g., SQL patterns for this project's DB layer, webhook signature verification, scraper response safety, framework-specific auth quirks) -->

## Output Format

**SECURITY VERDICT**: [PASS | FAIL | NEEDS_DISCUSSION]

**FINDINGS**:

| Severity | Category | File | Line | Issue |
|----------|----------|------|------|-------|
| CRITICAL/HIGH/MEDIUM/LOW | Input/Auth/Secrets/Exposure/Resource | path | 42 | Description |

**CRITICAL** (must fix before merge):
- {list or 'None'}

**HIGH** (should fix before merge):
- {list or 'None'}

**MEDIUM** (fix soon):
- {list or 'None'}

**LOW** (informational):
- {list or 'None'}
"
)
```

#### Performance reviewer (conditional)

```
Task(
  subagent_type="performance-testing-review:performance-engineer",
  model="sonnet",
  prompt="# Performance Review

Review the PR diff for performance issues. Focus on real bottlenecks,
not micro-optimizations.

## Changes to Review

The diff is saved at: {diff_file}

Use the Read tool to load the full diff before starting your review.

## Blast Radius (from code graph)

{blast_radius from detect_changes}

## Review Instructions

Read `CLAUDE.md` for project conventions and performance constraints.
Read `rules/quality-bar.md` for the complexity and performance
decision gates.

Check these universal concerns:

### 1. Query Patterns
- Any N+1 queries (loop of individual DB calls)?
- Missing indexes for filtered/sorted columns?
- Unbounded queries without LIMIT?
- Unnecessary data fetched (SELECT * when only 2 columns needed)?
- Queries inside a request loop that could be batched?

### 2. Algorithmic Complexity
- O(n^2) or worse on unbounded input?
- Linear scans where hash lookups exist?
- Loading unbounded data into memory?
- Allocations in tight loops that could be hoisted?

### 3. Concurrency and I/O
- Sync I/O blocking the event loop (async def with sync calls)?
- Sequential external calls that could be concurrent?
- Missing timeouts on external service calls?
- Missing deduplication of repeat external calls?

### 4. Resource Usage
- Large files loaded entirely into memory?
- HTTP clients or DB connections opened but not closed?
- Missing connection pooling?
- Batch operations written as per-item loops?

<!-- CUSTOMIZE: Add project-specific performance check categories here (e.g., specific hot-path modules, batch job patterns, scraper politeness, streaming constraints, framework-specific pitfalls) -->

## Output Format

**PERFORMANCE VERDICT**: [PASS | FAIL | NEEDS_DISCUSSION]

**FINDINGS**:

| Severity | Category | File | Line | Issue | Impact |
|----------|----------|------|------|-------|--------|
| BLOCKER/WARNING/NIT | Query/Algorithm/I-O/Resource | path | 42 | Description | Estimated impact |

**BLOCKERS** (will cause performance problems):
- {list or 'None'}

**WARNINGS** (potential issues at scale):
- {list or 'None'}

**NITS** (minor optimizations):
- {list or 'None'}
"
)
```

### Step 5: Merge verdicts

Collect verdicts from all agents that ran:

- **Code review**: APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION
- **Security** (if ran): PASS / FAIL / NEEDS_DISCUSSION
- **Performance** (if ran): PASS / FAIL / NEEDS_DISCUSSION

**Overall verdict**:

- If ANY agent returns FAIL or REQUEST_CHANGES: overall is **REQUEST_CHANGES**
- If ANY agent returns NEEDS_DISCUSSION and none are FAIL: overall is **NEEDS_DISCUSSION**
- If ALL agents APPROVE/PASS: overall is **APPROVE**

Combine all findings into a single table tagged by source
(Code / Security / Performance) for the review comment in Step 7.

### Step 6: Process results and fix

**APPROVE**: Continue to Step 7, then Step 9 (auto-merge).

**REQUEST_CHANGES**:

1. Fix all blockers (from any agent)
2. Commit fixes: `git add -A && git commit -m "fix: address review findings for $ARGUMENTS"`
3. Push: `git push`
4. Re-run **only** the agents that returned REQUEST_CHANGES/FAIL from
   Step 4. Don't re-run agents that already passed.

After 3 total attempts, escalate to the user.

**NEEDS_DISCUSSION**: Surface concerns from all agents, wait for user
decision.

### Step 7: Append combined review findings as a tagged comment

Build the comment body, beginning with the `[review]` tag on its own
line followed by a blank line. Merge findings from **all agents that
ran** (code, security, performance) into a single tagged table.

```
[review]

**Overall verdict**: {VERDICT}
**Agents run**: code-reviewer{, security-auditor}{, performance-engineer}
**Summary**: {one-line summary}

## Requirements Check

- [ ] {criterion 1}: MET / NOT MET / PARTIAL
- [ ] {criterion 2}: MET / NOT MET / PARTIAL

## Findings

| Source | Severity | File | Line | Issue |
|--------|----------|------|------|-------|
| Code | BLOCKER/WARNING/NIT | path | 42 | Description |
| Security | CRITICAL/HIGH/MEDIUM/LOW | path | 42 | Description |
| Performance | BLOCKER/WARNING/NIT | path | 42 | Description |

**Blockers** ({count}): {list or 'None'}
**Warnings** ({count}): {list or 'None'}
**Nits** ({count}): {list or 'None'}
```

Append it to the Linear issue:

```bash
linear issue comment add $ARGUMENTS --body "{body}"
```

### Step 8: Cleanup diff file

```bash
rm "$DIFF_FILE" || true
```

### Step 9: Auto-merge on APPROVE

Only run this step if:

- VERDICT was APPROVE, AND
- A PR exists for the current branch (Context block shows a PR
  number)

If either condition is false, skip to Step 10.

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
git branch -D feat/$ARGUMENTS
```

(Use the correct prefix from `/build`'s Type-label mapping if the
branch was created as `fix/$ARGUMENTS`, `refactor/$ARGUMENTS`, etc.)

**E. Update Linear to Done:**

```bash
linear issue update $ARGUMENTS --state Done
linear issue comment add $ARGUMENTS --body "Review passed. PR merged to main."
```

### Step 10: Report to the user

- Overall verdict and which agents ran (code / security / performance)
- Count of findings by severity across all agents
- Blockers addressed (if any) and which agents re-ran after fixes
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
- Three agents run in parallel when their trigger paths match.
  Security and performance agents are conditional; code reviewer
  always runs. Spawn them in a single message with multiple Task
  calls to minimize wall-clock time.
- On re-review after fixes, only re-run the agents that returned
  REQUEST_CHANGES/FAIL — skip agents that already approved.
- Blast radius from `codebase-memory-mcp.detect_changes` is inlined
  into every agent prompt when available.
- Auto-merge only fires on APPROVE AND when a PR exists
- Extended thinking is enabled via `ultrathink` above.
