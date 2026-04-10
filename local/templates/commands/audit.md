---
name: audit
description: Read-only codebase audit for patterns, technical debt, security, and performance. Persists Critical and High findings to .workflow/audit-{date}.md.
argument-hint: [scope]
disable-model-invocation: false
allowed-tools: Bash(node *) Bash(git *) Bash(grep *)
---

# /audit

Analyze the codebase for patterns, technical debt, and improvement
opportunities.

## Arguments

- `$ARGUMENTS` - Optional: scope to audit (e.g., `backend`,
  `frontend`, or a specific path). If omitted, audits the entire
  codebase.

## Context

- Argument / scope: $ARGUMENTS

## Standing Instructions

- This command is READ-ONLY for the codebase. Do NOT fix issues.
- Findings are recommendations, not mandates.
- Only Critical and High findings are persisted to the audit report
  file. Medium and Low findings are reported inline but not persisted.
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

### Step 10: Persist findings

Write all **Critical** and **High** findings to a dated audit report
file. Medium and Low findings are reported above but not persisted.

**A. Write the audit report file:**

Create `.workflow/audit-{YYYY-MM-DD}.md` with the Critical and High
findings from Step 9. Use the same markdown format. If the file
already exists (multiple audits on the same day), append a counter
suffix: `audit-{YYYY-MM-DD}-2.md`.

**B. Offer to create streams for actionable findings:**

If any Critical or High finding warrants a dedicated work stream
(fix, refactor, investigation), ask the user:

```
AskUserQuestion(
  questions=[{
    question: "Would you like to create streams for any of these findings so they can be tracked through the workflow?",
    header: "Create streams",
    options: [
      { label: "No", description: "Just keep the audit report" },
      { label: "Yes", description: "I'll pick which findings to track" }
    ],
    multiSelect: false
  }]
)
```

**If "Yes"**: for each finding the user selects, create a stream:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" create "Audit: {finding title}"
```

**C. Report to the user:**

- Count of findings by severity
- Audit report file path
- Number of streams created (if any)
- Reminder: Medium and Low findings were reported inline above but
  are not persisted

## Notes

- This is a **read-only** command for the codebase - it does not
  fix issues
- Findings are recommendations, not mandates
- Use judgment on severity (context matters)
- Run regularly (weekly recommended)
- Critical and High findings are persisted to `.workflow/audit-{date}.md`
- Medium and Low findings appear in the report but are not persisted
- Previous audit findings are looked up via `claude-mem` (if
  installed) to flag recurring issues
- Extended thinking is enabled via `ultrathink` above
