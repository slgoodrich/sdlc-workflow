---
name: test
description: Write comprehensive tests, run them, and debug failures. Reads the file scope from git diff. Writes a verdict as a [test] comment.
argument-hint: <issue-id>
disable-model-invocation: true
allowed-tools: Bash(linear *) Bash(git *) Bash(npm *) Bash(pnpm *) Bash(yarn *) Bash(pytest *) Bash(go *) Bash(cargo *)
---

# /test

Write comprehensive tests, run them, and debug failures using
specialist agents.

## Context

- Issue: !`linear issue view $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace -->`
- Changed files on this branch: !`git diff --name-only $(git merge-base HEAD main 2>/dev/null || echo HEAD~1)`
- Uncommitted changes: !`git diff --name-only HEAD`

## Standing Instructions

- Test scope comes from `git diff` — the canonical record of what
  changed on this branch. The file list is in the Context block
  above.
- `/build` does NOT write a file list to Linear. Never look for
  `[build]` comments or a Build section in the description.
- Supplementary context (acceptance criteria, test strategy) comes
  from the `## Plan` and `## Technical Spec` sections of the
  description. These are OPTIONAL — tests can be written without
  them.
- Follow project test patterns exactly. Do NOT introduce new
  conventions.
- Never weaken tests to make them pass. Never delete failing tests.
- If stuck after 3 total fix attempts, escalate to the user.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one issue before moving to the next.

## Execution

### Step 1: Determine test scope

**A. Read the changed files list from the Context block:**

The Context block above pre-fetched two git diff results:

- Branch vs merge base — all changes on this branch (committed +
  uncommitted)
- Uncommitted changes — currently dirty files

Take the union of both lists. Deduplicate. Filter to source files
only (exclude test files, config files, docs).

If both lists are empty, stop and tell the user there's nothing to
test. If the user wants to test something specific, ask them to
specify.

**B. Load supplementary context from the description:**

Parse the Linear issue description (from the Context block's issue
view output) for:

- **Acceptance criteria**: `## Plan > ### Acceptance Criteria`
- **Test strategy**: `## Technical Spec > ### Test Strategy`

These provide intent for writing meaningful tests. They do NOT drive
the scope. Scope comes from git only.

**C. Past test patterns**: try claude-mem:

```
mcp__claude-mem__search(query="test patterns {technical area}")
```

Store as `{relevant_patterns}` and `{relevant_learnings}`. If
claude-mem is not installed or the query fails, fall back to empty
and log:

```
[scaffold] claude-mem not available, skipping past test context
```

### Step 2: Detect test setup

Read the project's `package.json` (or equivalent) to determine:

- Test runner and command
- Test file patterns and location conventions
- Coverage command (if configured)

Also check `CLAUDE.md` for project-specific test conventions.

If no test runner detected, stop: "No test runner found. Add a test
script to package.json or tell me which runner to use."

### Step 3: Write tests

Spawn the test-writer agent for the scoped files:

```
Task(
  subagent_type="unit-testing:test-writer",
  prompt="# Write Tests

Write comprehensive tests for the following source files:
{list of source files from Step 1}

Read each source file to understand its exports, functions, and behavior.

## Scope Source
Changed files: {list from git diff}. Tests should cover the behavior of these files.

## Acceptance Criteria
{extracted from the ## Plan > ### Acceptance Criteria section, or
'Not available - write tests based on the code behavior.'}

## Test Strategy
{extracted from the ## Technical Spec > ### Test Strategy section, or
'Not available - use project conventions.'}

## Established Patterns
{relevant_patterns from claude-mem, or 'None'}

## Relevant Past Work
{relevant_learnings from claude-mem, or 'None found' if empty}

## Test Setup

- Test runner: {detected runner}
- Test file pattern: {detected pattern, e.g., *.test.ts}
- Test location: {detected convention, e.g., co-located, __tests__/, tests/}

## Instructions

For each source file in scope:

1. Read the source file to understand its exports, functions, and behavior
2. Find any existing test file for it
3. If no test file exists, create one from scratch
4. If a test file exists, read it and add tests for uncovered code

Read CLAUDE.md for project conventions. Read `rules/tests.md` for project-specific testing standards (framework, structure, what to test, mocking approach, coverage requirements). Read `rules/quality-bar.md` for code quality standards.

Write tests covering:
- **Happy path**: Every exported function/class with typical inputs
- **Edge cases**: Empty inputs, boundary values, null/undefined where applicable
- **Error paths**: Invalid inputs, failure modes, expected throws
- **Integration points**: How this code interacts with its dependencies

Follow the project's existing test patterns exactly:
- Same assertion style (expect vs assert)
- Same mocking approach
- Same file naming and describe/it structure
- Follow patterns from the established patterns and past learnings above

Do NOT:
- Write tests that only assert implementation details (mock call counts are not behavior tests)
- Pad coverage with meaningless assertions
- Test getters/setters or trivial wrappers
- Write 100-line setup blocks

Report: files created/modified, number of test cases added, what they cover."
)
```

### Step 4: Run tests

Run the test suite scoped to the files from Step 1:

```bash
{test command with scope filter}
```

**If all tests pass**: Skip to Step 6.

**If tests fail**: Continue to Step 5.

### Step 5: Debug and fix failures

Spawn the debugger agent:

```
Task(
  subagent_type="debugging-toolkit:debugger",
  prompt="# Debug Test Failures

The following tests are failing:

{paste failing test names and error output from Step 4}

## Context

These tests were just written or updated for:
{list of source files from scope}

Acceptance criteria from the Linear issue description:
{extracted acceptance criteria, if available}

## Instructions

For each failing test:

1. Read the test file to understand what it expects
2. Read the source file to understand actual behavior
3. Classify the failure:
   - **Bad test**: Test has wrong expectations. Fix the test.
   - **Bug in source**: Test exposed a real bug. Fix the source code.
   - **Stale test**: Pre-existing test outdated vs current code. Update the test.
   - **Flaky**: Non-deterministic (timing, ordering, state leaks). Fix root cause.
   - **Environment**: Missing deps, wrong config. Report what's needed.

4. Fix based on classification

Do NOT:
- Delete or skip tests to make the suite pass
- Weaken assertions to avoid failures
- Silently change intended behavior

Report: what each failure was, classification, and what was fixed."
)
```

After the agent returns, re-run tests:

```bash
{test command with scope filter}
```

**If all pass**: Proceed to Step 6.

**If still failing**: Send remaining failures back to the debugger
agent. After 3 total attempts, stop and report what's still failing
and what was tried. Ask the user for guidance.

### Step 6: Full suite verification

Run the complete test suite (not just scoped) to catch regressions:

```bash
{full test command}
```

If new failures appear outside scope, debug those too (back to
Step 5).

### Step 7: Coverage check

If the project has a coverage command, run it and report:

- Overall coverage percentage
- Coverage for files in scope specifically
- Files below threshold (if configured)

### Step 8: Report as a tagged Linear comment

Build the comment body, beginning with the `[test]` tag on its own
line followed by a blank line:

```
[test]

## Test Results

**Status**: PASS / FAIL
**Tests**: {passed}/{total} passed, {skipped} skipped
**Coverage**: {percentage}%

### Tests Written
- {file}: {N} tests added ({what they cover})

### Failures Fixed
- {test name}: {classification} -> {fix applied}

### Remaining Issues
- {test name}: {why it still fails}

### Coverage Gaps
- {file}: {uncovered lines/functions}
```

Append it to the Linear issue:

```bash
linear issue comment add $ARGUMENTS --workspace <!-- CUSTOMIZE: workspace --> --body "{body}"
```

If a prior `[test]` comment exists, leave it in place and append the
new one. Downstream commands use the most recent `[test]` comment.

## Context Flow

```
/build commits code changes (no Linear writes during build)
  -> /test reads git diff (scope = changed source files)
  -> /test reads source files directly
  -> /test reads description for supplementary context (## Plan, ## Technical Spec)
  -> /test spawns test-writer with: source files + acceptance criteria + test strategy
  -> /test writes results as a [test] comment
  -> /review reads the [test] comment
```

## Notes

- Write tests FIRST, then run — don't run before writing
- Follow existing test patterns exactly (don't introduce new conventions)
- Test behavior, not implementation details
- NEVER weaken tests to make them pass
- If stuck after 3 fix attempts, escalate to user
- `git diff` is ground truth for scope; description sections are
  supplementary for intent
