# Work Item Breakdown Framework

How we structure and size work items.

## Structure: Parent (Epic) > Sub-Items

Large features use the original item as the **parent/epic**. Individual
work items are **sub-items** under that parent.

```
Stream 1:  Feature Name (Epic, High)
├── Stream 1a: First sub-task (BE, MVP, Medium)
├── Stream 1b: Second sub-task (FE, MVP, Medium)
├── Stream 1c: Third sub-task (BE, MVP, Medium)
└── Stream 1d: Fourth sub-task (FE, MVP, Low)
```

## Breaking Down: MOVE, Don't Copy

When splitting a large item into sub-items:

1. **Parent becomes a summary** -- strip detailed implementation from
   parent, keep only:
   - High-level goal/context
   - Links to related docs or designs
   - Success criteria for the whole feature
   - List of sub-items

2. **Sub-items get the details** -- move (not copy) specific
   implementation info:
   - Acceptance criteria for that piece
   - Files to modify
   - Technical approach
   - Edge cases relevant to that piece

**Bad example** (copying):

```
Parent: [5 pages of detailed implementation]
Sub-item 1: [Copy of section 1 from parent]
Sub-item 2: [Copy of section 2 from parent]
```

**Good example** (moving):

```
Parent: "Build packages list page. See sub-items for implementation."
Sub-item 1: [Detailed acceptance criteria + files for filters]
Sub-item 2: [Detailed acceptance criteria + files for table]
```

## Required Categories

Every work item should be tagged with:

| Category | Options |
|---|---|
| Type | Bug, Feature, Improvement |
| Scope | BE, FE |
| Complexity | Low, Medium, High |
| Version | MVP, v2 |

## Sizing Items for Context Windows

- The item description + all relevant code context should fit
  comfortably in one conversation
- If understanding the task requires reading more than ~5-6 files, it's
  probably too big
- If you'd need to "remember" earlier work while doing later work, split
  it up
- When in doubt, smaller is better -- items can always be batched
  together

### Complexity Heuristic

| Complexity | Files Changed | Signals |
|---|---|---|
| Low | 1-2 files | Single function, config change, small UI tweak |
| Medium | 3-4 files | New endpoint + tests, component + styling |
| High | 5+ files | Cross-cutting change, new feature with multiple touchpoints |

If complexity is High (5+ files), automatically break the item down
further until all resulting items are Low or Medium.

## Each Item Should

- Be completable in one session with clear "done" criteria
- Touch a limited surface area (ideally 1-3 files changing)
- Not require decisions -- if there's a fork, flag it for the user to
  decide first
- Be independently verifiable (can test it works without other pieces)

## Split Along These Dimensions

- Vertical slices (thin path through the stack) over horizontal layers
- Happy path first, then edge cases/error handling as separate items
- New capability, then refinement/polish
- If infrastructure is needed (new tables, new services), that's often
  its own item

## Parent (Epic) Description Format

After breakdown, the parent description is a **flat overview**. No
command-owned section headers (`## Plan`, `## Design`,
`## Technical Spec`). Those headers belong on sub-items where the
actual work happens.

The parent should contain ONLY:

- `## Original Request` (preserved unstructured user text, if any)
- Brief summary of the feature/goal (1-2 paragraphs max)
- High-level success criteria for the whole feature
- List of sub-items with IDs and one-line descriptions
- Links to relevant docs, designs, or related items
- Dependencies on other epics (if any)

**Remove from parent after breakdown:**

- Detailed implementation notes (move to sub-items)
- File lists (move to sub-items)
- Edge cases (distribute to relevant sub-items)
- Acceptance criteria for specific pieces (move to sub-items)
- Any `## Plan` section that existed before breakdown (the plan was
  distributed to sub-items; the parent keeps only the goal and
  success criteria as plain text)

## Sub-Item Description Format

Each sub-item must be a self-contained unit that downstream commands
(`/refine`, `/build`, `/test`, `/review`) can operate on. Structure
the description with a `## Plan` section so `/refine` can find it:

```markdown
## Plan

### Scope
{what this piece does, 1-2 sentences}

### Files
- path/to/file1 - {what changes}
- path/to/file2 - {what changes}

### Acceptance Criteria
- {criterion 1}
- {criterion 2}

### Edge Cases
- {case 1}

### Dependencies
{blocking sub-items, or "None"}
```

The `## Plan` heading is required. `/refine` checks for it before
producing a Technical Spec. Without it, the sub-item is a dead end
in the command pipeline.

Each sub-item must also have:

- Clear title (action-oriented)
- Categories: Type + Scope + Complexity + Version

## Don't

- Create items that are just "research" or "figure out" -- make
  decisions explicit
- Bundle unrelated changes
- Create items so small they're just chores (unless appropriate)
- Skip categorization
