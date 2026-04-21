---
name: test
description: Write tests, run them, debug failures, then commit, push the branch, and open the PR.
argument-hint: <stream-id>
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(git *) Bash(gh *) Bash(npm *) Bash(pnpm *) Bash(yarn *) Bash(pytest *) Bash(go *) Bash(cargo *)
---

# /test

Write comprehensive tests, run them, and debug failures using
specialist agents.

## Context

- Stream metadata: !`node .workflow/bin/stream.js read $ARGUMENTS meta`
- Changed files on this branch: !`git diff --name-only $(git merge-base HEAD main 2>/dev/null || echo HEAD~1)`
- Uncommitted changes: !`git diff --name-only HEAD`

## Standing Instructions

- Test scope comes from `git diff` - the canonical record of what
  changed on this branch. The file list is in the Context block
  above.
- `/build` does NOT write a file list anywhere. Never look for build
  output in the stream directory.
- Supplementary context (acceptance criteria, test strategy) comes
  from `plan.md` and `spec.md` in the stream directory. These are
  OPTIONAL - tests can be written without them.
- Follow project test patterns exactly. Do NOT introduce new
  conventions.
- Never weaken tests to make them pass. Never delete failing tests.
- If stuck after 3 total fix attempts, escalate to the user.
- If multiple identifiers provided, process them SEQUENTIALLY.
  Complete all steps for one stream before moving to the next.

## Execution

### Step 1: Determine test scope

**A. Read the changed files list from the Context block:**

The Context block above pre-fetched two git diff results:

- Branch vs merge base - all changes on this branch (committed +
  uncommitted)
- Uncommitted changes - currently dirty files

Take the union of both lists. Deduplicate. Filter to source files
only (exclude test files, config files, docs).

If both lists are empty, stop and tell the user there's nothing to
test. If the user wants to test something specific, ask them to
specify.

**B. Load supplementary context from the stream:**

Read the stream's plan and spec files for intent context:

```bash
node .workflow/bin/stream.js read $ARGUMENTS plan
node .workflow/bin/stream.js read $ARGUMENTS spec
```

Extract:

- **Acceptance criteria**: from plan.md `### Acceptance Criteria`
- **Test strategy**: from spec.md `### Test Strategy`

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
{extracted from plan.md ### Acceptance Criteria section, or
'Not available - write tests based on the code behavior.'}

## Test Strategy
{extracted from spec.md ### Test Strategy section, or
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

Acceptance criteria from plan.md:
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

### Step 8: Report test results

Print the test summary to the terminal:

```
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

### Step 9: Commit, push, and open PR

`/build` commits implementation locally but does not push. `/test` is
the step that publishes the feature branch to the remote and opens
the PR (with both implementation and tests together).

**A. Sync with main and commit test files:**

Merge main into the feature branch before committing - same rationale
as `/build` Step 4. Catches conflicts while the test agent still has
full context on what was tested.

```bash
git fetch origin main
git merge origin/main
```

**If conflicts**: Resolve them, preserving test correctness. Re-run
the test suite after resolving to confirm nothing broke.

**If clean merge (or fast-forward)**: Continue.

Then stage and commit the test files:

```bash
git add -A
git commit -m "test: add tests for stream-$ARGUMENTS

stream-$ARGUMENTS"
```

If there are no changes to commit (e.g., `/build` already wrote the
tests in the same commit), skip the commit and move to 9B.

**B. Push the branch:**

```bash
git push -u origin $(git branch --show-current)
```

**C. Open a pull request:**

Check if a PR already exists for this branch:

```bash
gh pr view --json state 2>/dev/null
```

**If no PR exists**, create one:

```bash
gh pr create --title "{type}({scope}): {description}" --body "$(cat <<'EOF'
## Summary
- {bullet points from the spec and what was implemented}

## Test plan
- {test results summary from Step 8}
EOF
)"
```

The PR title follows conventional commit format. Derive `{type}` from
the branch prefix (e.g., `feat/` -> `feat`, `fix/` -> `fix`). Derive
`{scope}` from the primary module touched by the implementation.

**Do NOT use `--auto` on `gh pr create`.** Auto-merge is only set by
`/review` after the review passes. Creating a PR with auto-merge
bypasses code review.

**If a PR already exists**, just push. The PR updates automatically.

## Context Flow

```
/build commits code changes locally (no push, no stream writes)
  -> /test reads git diff (scope = changed source files)
  -> /test reads source files directly
  -> /test reads plan.md + spec.md for supplementary context
  -> /test spawns test-writer with: source files + acceptance criteria + test strategy
  -> /test prints results to terminal
  -> /test syncs with main, commits tests, pushes the branch, opens the PR
  -> /review reads the PR diff
```

## Notes

- Write tests FIRST, then run - don't run before writing
- Follow existing test patterns exactly (don't introduce new conventions)
- Test behavior, not implementation details
- NEVER weaken tests to make them pass
- If stuck after 3 fix attempts, escalate to user
- `git diff` is ground truth for scope; stream files are
  supplementary for intent
