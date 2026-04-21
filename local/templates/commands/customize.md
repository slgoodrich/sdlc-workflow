---
name: customize
description: Bootstrap a project for the scaffold workflow. Detects stack, enables agents, and populates rules. Run once per project.
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(node *) Bash(basename *) Bash(pwd *)
---

# /customize

Configure workflow commands and rules for a specific project's stack
and agents.

## Arguments

None. Stack is detected from the codebase or prompted interactively.

## Context

- Project path: !`pwd`
- Git remote: !`git remote get-url origin 2>/dev/null || echo "no-remote"`
- Default branch: !`git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||' || echo "main"`
- Directory basename: !`basename "$(pwd)"`

## Standing Instructions

- This command MODIFIES files. Review output carefully before
  committing.
- Idempotent - safe to re-run. Already-populated files are not
  re-prompted for.
- Keep CUSTOMIZE markers separate:
  - Routing table markers in `refine.md` and `build.md` use detected
    stack data
  - Don't cross-populate categories
- Use atomic writes for all file modifications (write to temp, then
  rename) to avoid corruption on partial failure.

## Execution

### Step 1: Detect stack

Scan the project root for stack signals:

| Signal | Stack |
|--------|-------|
| `package.json` + `tsconfig.json` | TypeScript/Node |
| `package.json` (no tsconfig) | JavaScript/Node |
| `requirements.txt` or `pyproject.toml` or `setup.py` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `pom.xml` or `build.gradle` | JVM (Java/Kotlin) |
| `Gemfile` | Ruby |
| `*.csproj` or `*.sln` | .NET/C# |
| `mix.exs` | Elixir |
| `Package.swift` | Swift |

Also detect secondary signals:

- **Framework**: Next.js, FastAPI, Django, Express, Rails, etc.
- **Database**: Prisma, Drizzle, SQLAlchemy, better-sqlite3, etc.
- **Test runner**: vitest, jest, pytest, go test, etc.
- **Package manager**: npm, pnpm, yarn, pip, poetry, cargo, etc.
- **Build tool**: tsup, esbuild, webpack, vite, etc.

**If no scaffold or ambiguous**: Ask the user:

```
AskUserQuestion(
  questions=[{
    question: "What stack is this project using?",
    header: "Stack",
    options: [
      { label: "TypeScript/Node", description: "Node.js with TypeScript" },
      { label: "Python", description: "Python (FastAPI, Django, etc.)" },
      { label: "Go", description: "Go modules" },
      { label: "Rust", description: "Cargo/Rust" }
    ],
    multiSelect: false
  }]
)
```

Record the detected stack for use in later steps.

### Step 2: Find applicable agents

Read the **global** `~/.claude/settings.json` and inspect its
`enabledPlugins` object. Each key is a plugin identifier
(`{name}@{source}`), and the value is `true` (globally enabled) or
`false` (installed but globally disabled).

Match the detected stack to relevant agent plugins:

| Stack | Relevant Plugins |
|---|---|
| TypeScript/Node | `javascript-typescript`, `debugging-toolkit`, `unit-testing` |
| Python | `python-development`, `debugging-toolkit`, `unit-testing` |
| Go | `systems-programming`, `debugging-toolkit` |
| Rust | `systems-programming`, `debugging-toolkit` |
| JVM | `jvm-languages`, `debugging-toolkit` |
| .NET | `dotnet-contribution`, `debugging-toolkit` |

Also check for cross-stack plugins:

- `database-cloud-optimization` or `database-design` (if database detected)
- `security-scanning` (always relevant)
- `application-performance` (always relevant)
- `ui-design` (if frontend detected)

The typical pattern: stack-neutral plugins (`pr-review-toolkit`,
`ai-pm-copilot`, etc.) are `true` globally and apply everywhere.
Stack-specific plugins are `false` globally - they exist in the
global file so Claude Code knows they're installed, but they're
disabled to avoid noise in projects that don't need them. These are
the ones that need to be enabled per-project.

Report to the user:

- Which globally-disabled plugins match this stack and will be
  enabled in the project's `.claude/settings.json`
- Any relevant plugins missing from the global file entirely
  (suggest the user install them)

### Step 3: Enable agents and update routing

**A. Enable chosen agents in project settings:**

The project's `.claude/settings.json` was created by `/setup-local`
with an empty `enabledPlugins` object. Read it, then merge in the
stack-relevant plugins that are globally disabled (`false` in
`~/.claude/settings.json`) but needed for this project. Set each
to `true`:

```json
{
  "enabledPlugins": {
    "{plugin-name}@{source}": true
  }
}
```

Rules:
- Only enable plugins that exist in `~/.claude/settings.json` (the
  global list is the source of truth for what's installed).
- Do not touch plugins already configured in the project settings.
- Do not copy globally-enabled plugins into the project file -
  they're already active everywhere. Only locally-needed overrides
  belong here.

**B. Update agent routing in refine.md and build.md:**

Replace the `<!-- CUSTOMIZE -->` agent routing tables in both files.

**In `commands/refine.md`**, replace the Agent Routing section:

```
## Agent Routing

<!-- CUSTOMIZE: Run /customize to populate this table -->
| Type | Agent | Signals |
|------|-------|---------|
```

With a table populated from the detected stack and enabled agents.
Example for TypeScript:

```
## Agent Routing

| Type | Agent | Signals |
|------|-------|---------|
| TypeScript | `javascript-typescript:typescript-pro` | TS/JS code, Node.js, frontend |
| Database | `database-cloud-optimization:database-architect` | Schema, migration, queries |
```

Only include agents that are enabled. Do not include
`general-purpose` as a fallback.

**In `commands/build.md`**, replace the same pattern under
`### Step 2: Select agent`.

### Step 4: Update CLAUDE.md

Find the project's `CLAUDE.md` (project root). If it doesn't exist,
create it.

Add or update a `## Stack` section:

```markdown
## Stack

- **Language**: {detected language}
- **Framework**: {detected framework, if any}
- **Database**: {detected database, if any}
- **Test runner**: {detected test runner}
- **Package manager**: {detected package manager}

## Agents

The following agents are configured for this project:

| Agent | Purpose |
|---|---|
| `{agent-id}` | {what it does} |
```

If CLAUDE.md already has these sections, replace them. Do not touch
other sections.

### Step 5: Update context7-lookup.md

Read `rules/context7-lookup.md`. Replace the `<!-- CUSTOMIZE: -->`
sections with entries for the detected stack.

**A. "When to query" list:**

Replace the placeholder with the project's frameworks. Use
`resolve-library-id` from Context7 to find the correct IDs. Example
for TypeScript/Node with better-sqlite3:

```markdown
## When to query

- Node.js APIs (fs, path, crypto, child_process)
- TypeScript features (generics, utility types, module resolution)
- better-sqlite3 methods (prepare, run, all, pragma, transactions)
- vitest features (describe, it, expect, vi.mock, vi.spyOn)
- Any API you're not 100% certain about
```

**B. Library IDs table:**

Query Context7 `resolve-library-id` for each detected
framework/library to get the correct ID. Populate the table:

```markdown
| Framework | Context7 ID | Use for |
|---|---|---|
| Node.js | `/websites/nodejs_api` | fs, path, crypto, child_process, Buffer |
| TypeScript | `/websites/typescriptlang` | Types, generics, module resolution, config |
```

Only include libraries that are actually used in the project
(detected from package.json, imports, etc.).

**C. "Do NOT skip" list:**

Replace with the project's most commonly misused or version-sensitive
APIs.

### Step 6: Update tests.md

Read `rules/tests.md`. Replace the `<!-- CUSTOMIZE: -->` sections.

**A. Framework section:**

Replace with the detected test runner and config:

```markdown
## Framework

- **Vitest** for all tests. No Jest, no Mocha.
- Single `vitest.config.ts` at project root
- `npm test` runs all tests
```

Adjust for the detected test runner (vitest, jest, pytest, go test,
etc.).

**B. "Always test" additions:**

Add project-specific test targets below the generic ones. Examples:

- For MCP servers: "MCP tool handlers (input validation, success paths, error paths)"
- For APIs: "API route handlers (auth, validation, response format)"
- For CLIs: "CLI command handlers (argument parsing, output format)"

**C. File structure:**

Replace with the project's actual test file layout, detected from
the codebase. Show 2-3 representative examples of source + test file
pairs.

### Step 7: Update quality-bar.md

Read `rules/quality-bar.md`. Replace every `<!-- CUSTOMIZE: -->`
marker with project-appropriate content.

The markers to replace:

1. **Complexity rules** - stack-appropriate rules
2. **Coupling rules** - separation of concerns for the detected architecture
3. **Validation rules** - validation approach for the stack (e.g.,
   zod for TS, pydantic for Python, struct tags for Go)
4. **Naming conventions** - domain language and any additional
   conventions beyond the defaults
5. **Error patterns** - idiomatic error handling for the language
6. **Performance requirements** - reasonable targets for the stack
7. **Conventions** - stdlib usage, idiomatic patterns for the language
8. **Abstraction rules** - language-appropriate architecture guidance
9. **Testing rules** - test framework and coverage expectations
10. **Completeness requirements** - what "done" means for this stack

Replace the `<!-- CUSTOMIZE: ... -->` comment with a
`**Project-specific {section name}:**` heading followed by the
content. Example:

```markdown
**Project-specific complexity rules:**
- No classes with fewer than 3 methods
- All migrations must be idempotent
```

Also update inline references to language/framework throughout
(e.g., "idiomatic TypeScript" -> "idiomatic Python").

### Step 8: Update git-workflow.md pre-commit hooks

Read `rules/git-workflow.md`. Replace the
`<!-- CUSTOMIZE: project-specific pre-commit hook list -->` marker
with a bulleted list of pre-commit hooks for the detected stack:

| Stack | Hooks |
|---|---|
| TypeScript/Node | `eslint`, `prettier`, `detect-secrets`, trailing-whitespace, end-of-file-fixer |
| Python | `ruff check`, `ruff format`, `detect-secrets`, trailing-whitespace, end-of-file-fixer |
| Go | `gofmt`, `golangci-lint`, `detect-secrets`, trailing-whitespace |
| Rust | `rustfmt`, `clippy`, `detect-secrets`, trailing-whitespace |
| JVM | `spotless`, `detect-secrets`, trailing-whitespace |
| Ruby | `rubocop`, `detect-secrets`, trailing-whitespace |

Only populate hooks for tools actually available in the project
(detected from package.json, pyproject.toml, go.mod, etc.).

Leave the `<!-- CUSTOMIZE: project-specific CI check names -->` marker
as-is unless the user has CI configured - /customize can't detect CI
names reliably. The user fills this in manually if needed.

### Step 9: Update error_handling.md code examples

Read `rules/error_handling.md`. Replace code examples with idiomatic
equivalents for the detected stack.

Key replacements:

- Code fence language tags (`typescript` -> `python`, `go`, etc.)
- Error handling patterns (try/catch -> try/except, if err != nil, etc.)
- Resource cleanup patterns (try/finally -> context managers, defer, etc.)
- Test examples (vitest -> pytest, testing package, etc.)
- Import patterns (node:fs -> os/pathlib, std packages, etc.)

Preserve the prose and principles. Only change code blocks and
language-specific references.

### Step 10: Populate review.md

One template file contains CUSTOMIZE markers that need project-
specific content generated from exploring the codebase:

- `.claude/commands/review.md` - security trigger paths, security
  check categories, performance trigger paths, performance check
  categories

Spawn an exploration agent to read the project and draft content.

**A. Explore project structure:**

Read the following to understand the project:

- `CLAUDE.md` at project root (if it exists) - especially the Stack
  section populated in Step 4
- Package manifest (`package.json`, `pyproject.toml`, `go.mod`, etc.)
- Top-level directories to identify components (e.g., `src/`, `lib/`,
  `cmd/`, `pkg/`)
- Key entry-point files (e.g., `main.*`, `index.*`, CLI entry points)
- `.env.example` or similar (if present) to understand external
  dependencies

Store findings as `{project_context}`.

**B. Dispatch exploration agent:**

```
Task(
  subagent_type="Explore",
  prompt="# Security/Performance Template Population

Read the project structure and generate content for review.md.

## Project Context
{project_context from Step 10.A}

## Task 1: review.md CUSTOMIZE markers

Generate four pieces of content for .claude/commands/review.md:

### 1.1 Security trigger paths (table rows)
List file path patterns that should trigger the security auditor agent.
Look for: config loaders, auth flows, input parsing (HTTP routes,
webhook handlers, file uploads), DB query construction, secret-handling
files, dependency manifests, anything at a trust boundary.

Output format: markdown table rows with the | Trigger paths | Rationale | columns.

### 1.2 Security check categories (prompt additions)
List security concerns specific to this project. For each, include
example checks. Examples: SQL injection in the DB layer, YAML loading
safety if config is YAML, scraper response validation if the project
scrapes external sites, framework-specific auth quirks.

Output format: numbered subsections with ### headings, matching the
existing security prompt style in review.md.

### 1.3 Performance trigger paths (table rows)
List file path patterns for hot paths that should trigger the
performance reviewer. Look for: data pipelines, batch jobs, query
layers, request handlers on high-traffic routes, scraping loops,
anything in a tight iteration.

Output format: markdown table rows with the | Trigger paths | Rationale | columns.

### 1.4 Performance check categories (prompt additions)
List performance concerns specific to this project. Examples: N+1
queries in the ORM, scraper politeness delays, batch transaction
patterns, memory pressure from unbounded results.

Output format: numbered subsections matching the performance prompt style.

## Output Format

Return a structured response:

### Security trigger paths
{markdown table rows}

### Security check categories
{numbered ### subsections}

### Performance trigger paths
{markdown table rows}

### Performance check categories
{numbered ### subsections}

Do NOT implement anything. Return text only."
)
```

**C. Apply generated content to review.md:**

Take the four pieces from Task 1 and substitute them into
`.claude/commands/review.md`:

| Marker | Replace with |
|---|---|
| `<!-- CUSTOMIZE: Populate with project-specific security and performance trigger paths -->` | Trigger paths table rows (1.1 + 1.3) |
| `<!-- CUSTOMIZE: Add project-specific security check categories here ... -->` | Security check categories (1.2) |
| `<!-- CUSTOMIZE: Add project-specific performance check categories here ... -->` | Performance check categories (1.4) |

The trigger paths table marker sits above the existing dispatch
table in Step 3.C of review.md. Replace the marker comment with the
combined security (1.1) and performance (1.3) trigger path rows from
the agent, appending them to the existing Security auditor and
Performance reviewer rows so the project-specific paths augment the
generic rules.

Use an atomic write.

**D. Optional post-merge commands prompt:**

By default, `review.md` has no post-merge step. Most projects don't
need one (libraries, CLIs, static sites, platform-auto-deployed
apps). Ask the user, regardless of detected stack:

```
AskUserQuestion(
  questions=[{
    question: "Does this project need post-merge commands to run after auto-merge (e.g., database migrations, deploys, cache warmers)?",
    header: "Post-merge",
    options: [
      { label: "No", description: "No post-merge commands needed" },
      { label: "Yes", description: "I'll provide the commands" }
    ],
    multiSelect: false
  }]
)
```

**If the user answers "No"**: do nothing. `review.md` stays as-is
with no post-merge step. Continue to Step 10.E.

**If the user answers "Yes"**: prompt the user for the actual
commands as free text:

```
AskUserQuestion(
  questions=[{
    question: "Enter the post-merge commands to run after auto-merge. They will be inserted into review.md as a bash block. One command per line.",
    header: "Commands"
  }]
)
```

Store the response as `{post_merge_commands}`.

Then insert a new sub-step into `review.md` between sub-step D
("Return to the default branch and clean up") and the next sub-step
("Update stream to Done"). After insertion, the next sub-step's
letter advances by one (E becomes F).

Read `review.md` to find the exact location. Locate the heading
literal `**E. Update stream to Done:**` and replace it with the
following text (note: outer fence is four backticks because the
inserted content contains a nested triple-backtick bash block):

````
**E. Project-specific post-merge commands:**

```bash
{post_merge_commands}
```

**F. Update stream to Done:**
````

Use an atomic write (write to a temp file then rename) so a partial
edit can never leave `review.md` corrupt.

**Re-run idempotence**: First-run insertion is the supported flow.
If the user re-runs `/customize` later and changes their answer, the
matching logic above (which keys off the literal `**E. Update stream
to Done:**` heading) will only succeed if review.md still has its
default shape. Once a post-merge block exists, the heading is `**F.
Update stream to Done:**`, so re-runs will not re-insert or remove
the block. Document this as a limitation: changing post-merge
behavior after initial setup requires editing `review.md` manually.

**E. Report:**

Tell the user:

```
Populated architectural templates:
- .claude/commands/review.md: {N} markers filled, {M} skipped
- Post-merge step: {inserted into review.md | not needed for this project}

Skipped markers are left as-is for manual fill. Review the populated
content before committing - the exploration agent makes best-effort
inferences from project structure.
```

### Step 11: Summarize

Report to the user in this structure:

**Stack detected**: {language + framework + database + test runner}

**Agents configured**: {list of agents added to routing tables}

**Agents available but not enabled**: {suggest enabling}

**Files updated**:

- `.claude/commands/refine.md` - agent routing table
- `.claude/commands/build.md` - agent selection table
- `.claude/commands/review.md` - security/performance trigger paths and check categories
- `.claude/rules/context7-lookup.md` - library IDs and query guidance
- `.claude/rules/tests.md` - test framework and project-specific targets
- `.claude/rules/quality-bar.md` - project-specific sections
- `.claude/rules/error_handling.md` - code examples
- `.claude/rules/git-workflow.md` - pre-commit hooks for the detected stack
- `.claude/settings.json` - enabled plugins
- `CLAUDE.md` - stack and agent info

**Next steps**:

1. Review the populated files before committing. The exploration
   agent makes best-effort inferences from project structure.

2. Try the full workflow on a work stream:
   - Create a stream: `node .workflow/bin/stream.js create "my feature"`
   - Run `/plan` to capture requirements
   - Run `/design`, `/refine` as needed
   - Run `/build`, `/test`, `/review` to implement and merge

**If anything looks wrong**: re-run `/customize` to refresh detection
and re-populate files. The command is idempotent.

## Notes

- Run this once per project when first adopting the scaffold workflow
- Re-run if you add new agent plugins or change your stack
- This command modifies files in-place. Review the changes before
  committing.
