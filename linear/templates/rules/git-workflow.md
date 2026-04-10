# Git Workflow

Solo builder workflow optimized for Claude Code.

## Branch Strategy

Trunk-based development with short-lived feature branches.

```
main (always deployable)
  └── feat/short-description
  └── fix/short-description
  └── chore/short-description
  └── docs/short-description
  └── refactor/short-description
  └── test/short-description
```

- `main` is protected. No direct pushes.
- Every change goes through a feature branch + PR.
- Branches live hours to a couple days. If longer, scope is too big — split it.

## Branch Naming

```
feat/short-description      — new capability
fix/short-description       — bug fix
chore/short-description     — maintenance (deps, configs, tooling)
docs/short-description      — documentation only
refactor/short-description  — code restructuring, no behavior change
test/short-description      — test additions/updates
```

Lowercase, hyphen-separated. The prefix matches the **primary intent**
of the branch — the same six types used in [Commit
Conventions](#commit-conventions) below. If a branch has mixed commits,
pick the prefix that matches the dominant intent.

When using Linear, include the issue ID as the short description
(e.g., `feat/LAN-42`, `fix/LAN-127`). `/build` derives the prefix from
the Linear issue's Type label automatically.

## Commit Conventions

[Conventional commits](https://www.conventionalcommits.org/):

```
feat: add {new capability}
fix: handle {edge case or bug}
chore: {maintenance task}
docs: {documentation update}
refactor: {code restructuring without behavior change}
test: {test additions or updates}
```

Type prefix is required. Keep the subject under 72 characters. Body is
optional but encouraged for non-obvious changes.

## PR Workflow

Even solo, PRs are the quality gate. Claude Code's `/review` gives you
automated review on every PR.

1. `git checkout -b feat/thing` (or `fix/thing`, `refactor/thing`, etc. — match the primary intent)
2. Do the work
3. `/commit` to commit with a clean message
4. `git push -u origin feat/thing`
5. `gh pr create` (or `/commit-push-pr` to do 3-4-5 in one shot)
6. `/review` the PR
7. Squash merge to `main` via GitHub
8. Delete the branch

## Pre-commit Hooks

Managed via [pre-commit](https://pre-commit.com/). Config lives in
`.pre-commit-config.yaml`.

<!-- CUSTOMIZE: project-specific pre-commit hook list -->

Suggested hooks for common stacks:

- **TypeScript/Node**: `eslint`, `prettier`, `detect-secrets`, trailing
  whitespace, end-of-file fixer
- **Python**: `ruff check`, `ruff format`, `detect-secrets`, trailing
  whitespace, end-of-file fixer
- **Go**: `gofmt`, `golangci-lint`, `detect-secrets`
- **Rust**: `rustfmt`, `clippy`, `detect-secrets`

`/customize` populates this section with hooks for the detected stack.

Install once:

```bash
pip install pre-commit
pre-commit install
```

## What Not to Do

- `git push --force` on main
- Accumulate large branches. Break big features into stacked PRs.
- Skip PRs "just this once"
- Use `develop`, `staging`, or `release/*` branches. Solo builders don't
  need that overhead.
- Commit directly to main, even for "small" changes

---

## GitHub Setup (Manual)

These settings require the GitHub web UI. Go to **repo > Settings >
Rules > Rulesets** (or the older Branch Protection Rules).

### Create a Ruleset for `main`

1. Go to **Settings > Rules > Rulesets > New ruleset > New branch
   ruleset**
2. Name: `Protect main`
3. Enforcement: **Active**
4. Target branches: add `main`
5. Enable these rules:

| Rule | Setting |
|---|---|
| **Restrict deletions** | Enabled |
| **Require a pull request before merging** | Enabled |
| — Required approvals | 0 (solo, no one to approve) |
| — Dismiss stale PR approvals | Disabled |
| — Require conversation resolution | Optional |
| **Block force pushes** | Enabled |

6. Save

### Set Default Merge Strategy

1. Go to **Settings > General**, scroll to **Pull Requests**
2. Uncheck **Allow merge commits**
3. Check **Allow squash merging** (set default to "Pull request title
   and description")
4. Uncheck **Allow rebase merging**
5. Check **Automatically delete head branches**

This forces squash merge on every PR and auto-cleans branches after
merge.

### Optional: Require Status Checks

Once CI is set up, add required status checks:

1. Edit the `Protect main` ruleset
2. Add **Require status checks to pass**
3. Add your check names

<!-- CUSTOMIZE: project-specific CI check names (e.g., "test", "build", "lint") -->

Skip this until CI exists. Add it later.
