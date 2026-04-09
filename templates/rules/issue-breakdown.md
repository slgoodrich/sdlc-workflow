# Issue Breakdown Framework

How we structure and size work in Linear.

## Structure: Parent Issue (Epic) > Sub-Issues

Large features use the original issue as the **parent/epic**. Individual
work items are **sub-issues** under that parent.

```
<!-- CUSTOMIZE: team-prefix -->-1234: Feature Name (Epic, High)
├── <!-- CUSTOMIZE: team-prefix -->-1235: First sub-task (BE, MVP, Medium)
├── <!-- CUSTOMIZE: team-prefix -->-1236: Second sub-task (FE, MVP, Medium)
├── <!-- CUSTOMIZE: team-prefix -->-1237: Third sub-task (BE, MVP, Medium)
└── <!-- CUSTOMIZE: team-prefix -->-1238: Fourth sub-task (FE, MVP, Low)
```

## Breaking Down: MOVE, Don't Copy

When splitting a large issue into sub-issues:

1. **Parent becomes a summary** — strip detailed implementation from
   parent, keep only:
   - High-level goal/context
   - Links to related docs or designs
   - Success criteria for the whole feature
   - List of sub-issues (Linear shows this automatically)

2. **Sub-issues get the details** — move (not copy) specific
   implementation info:
   - Acceptance criteria for that piece
   - Files to modify
   - Technical approach
   - Edge cases relevant to that piece

3. **Add Epic label to parent** — use `Type | Epic` label for parent
   issues that have been broken down

**Bad example** (copying):

```
Parent: [5 pages of detailed implementation]
Sub-issue 1: [Copy of section 1 from parent]
Sub-issue 2: [Copy of section 2 from parent]
```

**Good example** (moving):

```
Parent: "Build packages list page. See sub-issues for implementation."
Sub-issue 1: [Detailed acceptance criteria + files for filters]
Sub-issue 2: [Detailed acceptance criteria + files for table]
```

## Required Labels

Every issue MUST have exactly one label from each category:

| Category | Options | IDs |
|---|---|---|
| Type | Bug, Feature, Improvement, Tech Debt, Testing | See below |
| Scope | BE, FE | See below |
| Complexity | Low, Medium, High | See below |
| Version | MVP, v2 | See below |

Labels within each category are **mutually exclusive** — an issue cannot
be both BE and FE, for example.

### Label IDs

**Type**

| Label | ID |
|---|---|
| Type | Epic |
| Type | Bug |
| Type | Feature |
| Type | Improvement |
| Type | Tech Debt |
| Type | Testing |

**Scope**

| Label | ID |
|---|---|
| Scope | BE |
| Scope | FE |

**Complexity**

| Label | ID |
|---|---|
| Complexity | Low |
| Complexity | Medium |
| Complexity | High |

**Version**

| Label | ID |
|---|---|
| Version | MVP |
| Version | v2 |

## Sizing Issues for Context Windows

- The issue description + all relevant code context should fit
  comfortably in one conversation
- If understanding the task requires reading more than ~5-6 files, it's
  probably too big
- If you'd need to "remember" earlier work while doing later work, split
  it up
- When in doubt, smaller is better — issues can always be batched
  together

### Complexity Heuristic

| Complexity | Files Changed | Signals |
|---|---|---|
| Low | 1-2 files | Single function, config change, small UI tweak |
| Medium | 3-4 files | New endpoint + tests, component + styling |
| High | 5+ files | Cross-cutting change, new feature with multiple touchpoints |

If complexity is High (5+ files), automatically break the issue down
further until all resulting issues are Low or Medium.

## Each Issue Should

- Be completable in one session with clear "done" criteria
- Touch a limited surface area (ideally 1-3 files changing)
- Not require decisions — if there's a fork, flag it for the user to
  decide first
- Be independently verifiable (can test it works without other pieces)

## Split Along These Dimensions

- Vertical slices (thin path through the stack) over horizontal layers
- Happy path first, then edge cases/error handling as separate issues
- New capability, then refinement/polish
- If infrastructure is needed (new tables, new services), that's often
  its own issue

## For Each Parent Issue (Epic), Provide

After breakdown, the parent should contain ONLY:

- Brief summary of the feature/goal (1-2 paragraphs max)
- Links to relevant docs, designs, or related issues
- High-level success criteria for the whole feature
- Dependencies on other epics (if any)

**Remove from parent after breakdown:**

- Detailed implementation notes (move to sub-issues)
- File lists (move to sub-issues)
- Edge cases (distribute to relevant sub-issues)
- Acceptance criteria for specific pieces (move to sub-issues)

## For Each Sub-Issue, Provide

- Clear title (action-oriented)
- Acceptance criteria (how do I know it's done?)
- Dependencies (which issues need to be done first?)
- Context: what files/areas of the codebase are involved
- Labels: Type + Scope + Complexity + Version (all required)

## Don't

- Create issues that are just "research" or "figure out" — make
  decisions explicit
- Bundle unrelated changes
- Create issues so small they're just chores (unless appropriate)
- Skip any of the four required label categories
