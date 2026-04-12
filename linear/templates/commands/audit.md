---
name: audit
description: Read-only codebase audit for patterns, technical debt, security, and performance. Creates Linear issues for all findings.
argument-hint: [scope]
disable-model-invocation: false
allowed-tools: Bash(linear *) Bash(git *) Bash(grep *)
---

# /audit

Analyze the codebase for patterns, technical debt, and improvement
opportunities.

## Arguments

- `$ARGUMENTS` — Optional: scope to audit (e.g., `backend`,
  `frontend`, or a specific path). If omitted, audits the entire
  codebase.

## Context

- Argument / scope: $ARGUMENTS
- Existing open issues: !`linear issue list -s backlog -s unstarted -s started --limit 50 --no-pager`

## Standing Instructions

- This command is READ-ONLY for the codebase. Do NOT fix issues.
- Findings are recommendations, not mandates.
- All findings become Linear issues. The user decides what is worth
  fixing in Linear.
- Use the correct Linear issue type for each finding: Bug for
  defects/vulnerabilities, Improvement for code quality/performance,
  Feature for missing capabilities. Do NOT use "Audit" as a label
  -- it does not exist.
- Before creating a Linear issue, check the existing issues list in
  the Context block for duplicates by title or description.
- Use extended thinking for analytical steps (pattern consistency,
  security, performance).
- This is the only command with `disable-model-invocation: false`
  because it is safe for Claude to auto-invoke (no side effects on
  the codebase).

ultrathink

## Execution

### Step 1: Load context

Read the architectural constraints:

- `CLAUDE.md` at project root for project conventions
- `rules/quality-bar.md`, `rules/tests.md`, `rules/error_handling.md`
  for standards

Try claude-mem for past audit findings to track recurring issues:

```
mcp__claude-mem__search(query="audit findings {scope or 'codebase'}")
```

If claude-mem is not installed or returns no results, continue with
empty `{past_findings}` and log:

```
[scaffold] claude-mem not available, skipping past audit context
```

Store results as `{past_findings}`. If recurring issues appear in
past findings, flag them as higher priority during the audit.

### Step 2: Determine scope

**If no argument**: audit the entire codebase.
**If argument provided**: focus on that scope only.

Identify frequently-modified (hot) files in scope. Try the code
graph first:

```
mcp__codebase-memory-mcp__search_code(query="{scope}")
```

If codebase-memory-mcp is not installed, fall back to git history:

```bash
git log --format=%n --name-only --since="3 months ago" -- <scope> | sort | uniq -c | sort -rn | head -20
```

Files with high churn or past issues deserve extra scrutiny during
the audit.

### Step 3: Pattern consistency check

Use the Explore agent to find inconsistent patterns:

```
Task(
  subagent_type="Explore",
  prompt="Search the {scope} for inconsistent patterns.

## Past Audit Findings
{past_findings from claude-mem, or 'No previous audits found' if empty}

Also check CLAUDE.md files for architectural constraints.

Look for:
1. Same problem solved differently across files
2. Naming inconsistencies
3. Different error handling approaches
4. Different data fetching patterns
5. Structure variations
6. Violations of CLAUDE.md architectural constraints

Report: file paths, what's inconsistent, suggested fix."
)
```

### Step 4: Dead code detection

```
Task(
  subagent_type="Explore",
  prompt="Find dead code and unused imports in {scope}.

Look for:
1. Unused imports (imported but never used)
2. Unreachable code (after return/throw)
3. Unused functions/components (defined but never called)
4. Commented-out code blocks
5. TODO/FIXME comments older than 30 days

Report: file:line, what's dead, confidence level."
)
```

### Step 5: Test coverage gaps

```
Task(
  subagent_type="Explore",
  prompt="Identify missing tests for critical paths in {scope}.

Critical paths:
- API endpoints without corresponding tests
- Database operations without integration tests
- Authentication/authorization flows
- Data validation functions

Check existing test files against source files.
Report: untested file/function, why it's critical, suggested test."
)
```

### Step 6: Security concerns

```
Task(
  subagent_type="security-scanning:security-auditor",
  prompt="Audit {scope} for security vulnerabilities.

Check for:
1. Hardcoded secrets, API keys, or credentials
2. Missing input validation
3. SQL injection vectors
4. XSS vulnerabilities
5. Missing authentication checks
6. Overly permissive CORS
7. Missing rate limiting
8. Insecure dependencies

Report: file:line, vulnerability type, severity (Critical/High/Medium/Low), fix."
)
```

### Step 7: Performance issues

```
Task(
  subagent_type="application-performance:performance-engineer",
  prompt="Find performance issues in {scope}.

Backend - check for:
1. N+1 queries (loop with database call inside)
2. Missing database indexes for common queries
3. Unbounded queries (no LIMIT)
4. Synchronous calls that could be async

Frontend - check for:
1. Unnecessary re-renders
2. Large bundle imports (importing entire library)
3. Missing image optimization
4. Blocking operations in render path

Report: file:line, issue type, estimated impact, fix."
)
```

### Step 8: Compile findings

Aggregate all findings from agents and rank by severity:

| Severity | Definition |
|----------|------------|
| Critical | Security vulnerability or data loss risk |
| High | Significant performance or reliability impact |
| Medium | Code quality or maintainability issue |
| Low | Minor inconsistency or style issue |

### Step 9: Output report

Present findings to the user:

```markdown
# Audit Report: {scope}
**Date**: {today}
**Files scanned**: {count}

## Critical ({count})
- [{file}:{line}] {description} - {fix}

## High ({count})
- [{file}:{line}] {description} - {fix}

## Medium ({count})
- [{file}:{line}] {description} - {fix}

## Low ({count})
- [{file}:{line}] {description} - {fix}

## Summary
- Total findings: {count}
- Top 3 areas needing attention: {areas}
- Recommended next actions: {actions}
```

### Step 10: Record findings as Linear issues

Create a tracked Linear issue for every finding.

**A. Check against existing issues (from Context block):**

The Context block pre-fetched the list of existing Linear issues.
For each finding, check that list for an existing issue covering
the same file and problem. If a match exists and is
still open, skip -- do not create a duplicate.

**B. Classify and create the Linear issue:**

Pick the correct type label based on the finding:

| Finding type | Type label |
|---|---|
| Security vulnerability, crash, data loss risk | Bug |
| Code quality, performance, missing validation | Improvement |
| Missing capability, missing test coverage | Feature |

Estimate complexity from the fix scope (this is about effort, not
severity -- do not use complexity labels to indicate severity):

| Fix scope | Complexity label |
|---|---|
| 1-2 files, single function | Low |
| 3-4 files, cross-cutting | Medium |
| 5+ files, architectural | High |

```bash
linear issue create \
  --title "{concise finding title}" \
  --label "{Bug | Improvement | Feature}" \
  --label "{Low | Medium | High}" \
  --label "BE" \
  --description "Found by /audit on $(date +%Y-%m-%d).

**Severity**: {Critical | High | Medium | Low}
**Location**: {file}:{line}

{finding description}

## Suggested fix
{recommended fix}"
```

**C. Track created issue IDs for the summary.**

After processing all findings, report to the user:

- Count of findings by severity
- Number of Linear issues created
- Number skipped as duplicates

## Notes

- This is a **read-only** command for the codebase — it does not
  fix issues
- Findings are recommendations, not mandates
- Use judgment on severity (context matters)
- Run regularly (weekly recommended)
- All findings become tracked Linear issues typed as Bug,
  Improvement, or Feature (whichever fits the finding)
- Previous audit findings are looked up via `claude-mem` (if
  installed) to flag recurring issues
- Extended thinking is enabled via `ultrathink` above
