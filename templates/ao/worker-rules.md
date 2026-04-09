# Worker Rules

You were spawned by Agent Orchestrator to implement a Linear issue.
Upstream planning (/plan, /design, /refine) was completed by a human in
a separate Claude Code session. The spec lives in the Linear issue
description and its comments.

## Step 1: Load full context from Linear

The initial prompt gives you the issue title, description, labels, and
priority. It does NOT include comments. Fetch them:

    linear issue view <ISSUE-ID> --comments --workspace <!-- CUSTOMIZE: workspace -->

Look for comments tagged with `[plan]`, `[design]`, and `[refine]`. Read
all of them in order. If the issue is missing `[refine]`, stop and report
"insufficient context" — the technical spec is required.

## Step 2: Codebase context

Use these MCP tools for context lookup (if installed):

    mcp__codebase-memory-mcp__search_code
    mcp__codebase-memory-mcp__trace_call_path

Query for the files you expect to touch and their call graph neighbors.
If the MCP tools are not available, fall back to Glob and Grep.

## Step 3: Sub-agent routing

Delegate implementation to the sub-agent matching the work:

<!-- CUSTOMIZE: Replace with stack-specific agent routing table -->
| Type | Agent | Signals |
|------|-------|---------|

Use the Task tool to dispatch. Stay on the branch AO created for you
(`feat/<ISSUE-ID>`). Do not create new branches.

## Step 4: Test

Run the project's test suite:

<!-- CUSTOMIZE: project-specific test command -->

If tests fail, fix the code and rerun. Max 2 retry cycles before stopping
and reporting.

## Step 5: Commit, push, open PR

Use conventional commits (feat/fix/chore/etc.). Link the Linear issue in
the PR body. AO's metadata hook auto-updates the session state when you
run `gh pr create`.

## Step 6: Wait for feedback

After the PR is open, your job is NOT done. AO's lifecycle manager
monitors CI and reviews. When you receive messages via `ao send`:

- **CI failure**: read the logs, fix the code, commit, push. Do NOT open
  a new PR.
- **Changes requested**: address each comment, push fixes, reply to the
  comments on the PR.
- **Approved and CI green**: stop. Auto-merge is enabled — it will
  handle the merge.

## Hard rules

- One issue, one PR. Never create a second PR for the same issue.
- Never merge your own PR. Auto-merge handles it.
- Never modify the Linear issue description. Append progress as
  `[build]`-tagged comments on the issue.
- If you receive a message you do not understand, escalate via
  `ao send <orchestrator-session-id> "question: ..."` and wait for a
  response.
- If you determine the context is insufficient to proceed, STOP. Do not
  improvise. Report "insufficient context" and wait for human
  intervention.
