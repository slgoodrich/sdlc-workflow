---
name: design
description: Define the user experience for a frontend feature. Writes design.md to the stream directory. Run after /plan, before /refine.
argument-hint: <stream-id>
disable-model-invocation: true
allowed-tools: Bash(node *)
---

# /design

Define the user experience for a frontend feature.

## Purpose

Bridge product requirements (WHY) and technical implementation (HOW)
by defining WHAT the user experiences. Focus on flows, interactions,
and behavior - not component specs or code architecture.

## Output

Writes a `design.md` file to the stream directory with:

- User goals and tasks
- User flow (entry -> completion)
- Information architecture
- Screen-by-screen experience
- Interactions and feedback
- Edge cases and error handling (UX perspective)
- Heuristic evaluation (Nielsen's 10)
- Visual design (components, layout, accessibility)

**NOT included** (that's `/refine`):

- TypeScript interfaces
- State management approach
- API calls and data fetching
- File structure and code organization

## Context

- Stream metadata: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS meta`
- Plan: !`node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS plan`
- Existing design (if any): !`node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS design`

## Standing Instructions

- `plan.md` is required. If the stream's plan.md is empty or
  missing, stop and tell the user to run `/plan` first.
- Focus on the USER experience, not the developer experience. If
  you're thinking about React components, you've gone too far.
- Design decisions should trace back to user goals from the plan.
- `$ARGUMENTS` is the stream ID. All stream.js calls use it
  explicitly.
- Re-running `/design` overwrites the existing design.md. The most
  recent design is the canonical design for downstream phases.

## Execution

### Step 0: Verify prerequisites

Verify plan.md is non-empty:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/stream.js" read $ARGUMENTS plan
```

If the plan is empty, stop and tell the user to run `/plan` first.

### Step 1: Load context

**Plan context (required)**: Parse the plan from the Context block
for `### Problem Statement`, `### Success Criteria`, and
`### Acceptance Criteria`. If the plan is empty, stop and tell the
user to run `/plan` first.

**Past design decisions and learnings**: Try claude-mem:

```
mcp__claude-mem__search(query="design decisions {feature domain}")
mcp__claude-mem__search(query="{user flow or feature being designed}")
```

If claude-mem is not installed or any query fails, fall back to empty
`{relevant_decisions}` and `{relevant_learnings}` and log:

```
[scaffold] claude-mem not available, skipping past design context
```

### Step 2: Extract requirements from the plan

From the stream's `plan.md`, extract:

- Problem being solved
- User persona / who benefits
- Success criteria
- Acceptance criteria

### Step 3: Analyze existing UX patterns

```
Task(
  subagent_type="Explore",
  prompt="Find existing UX patterns relevant to this feature.

Look for:
1. Similar user flows in the app
2. How we handle similar interactions
3. Existing page layouts and navigation patterns
4. Error handling and empty state patterns

Report:
- Patterns to follow for consistency
- Flows that work well we should replicate
- UX debt or anti-patterns to avoid"
)
```

### Step 4: Create UX specification

```
Task(
  subagent_type="ui-design:ui-designer",
  prompt="Create a user experience specification.

## Problem Context
{from the stream's plan.md - the problem and why we're solving it}

## User Persona
{who is doing this and what's their context}

## Success Criteria
{what does success look like for the user}

## Existing Patterns
{output from Step 3}

## Relevant Past Decisions
{relevant_decisions from claude-mem, or 'None' if empty}

## Relevant Past Learnings
{relevant_learnings from claude-mem, or 'None found' if empty}

---

## Create UX Specification

### 1. User Goals & Tasks

What is the user trying to accomplish? Use task analysis:
- Primary goal (the main thing they want to achieve)
- Secondary goals (nice-to-haves along the way)
- Tasks required to achieve each goal
- Mental model: How does the user think about this?

### 2. User Flow

Map the journey from entry to completion:

[Entry Point] -> [Step 1] -> [Step 2] -> [Decision] -> [Outcome]
                                |
                          [Alternative Path]

For each step:
- What triggers this step?
- What does the user see?
- What decisions do they make?
- What's the happy path vs alternatives?

### 3. Information Architecture

How is information organized and navigated?

- **Content hierarchy**: What's primary, secondary, tertiary?
- **Navigation**: How does user find things?
- **Progressive disclosure**: What's shown immediately vs on-demand?
- **Grouping**: How are related items clustered?
- **Labels**: What terminology is used? (Match user's mental model)
- **Search/filter**: How do users narrow down large data sets?

### 4. Screen-by-Screen Experience

For each screen/state in the flow:

**Screen Name**
- Entry: How does the user get here?
- Content: What information is displayed?
- Actions: What can the user do?
- Exit: Where can they go from here?
- Key question the user is asking: '...'

### 5. Interactions & Feedback

For each user action:
- What does the user do? (click, type, drag, etc.)
- What feedback do they get immediately?
- What happens in the background?
- How do they know it worked?

Cover:
- Loading states (what does the user see while waiting?)
- Success feedback (how do they know it worked?)
- Progress indication (for multi-step flows)

### 6. Edge Cases & Error Handling

From the USER's perspective (not technical):
- Empty states: First-time user, no data yet
- Error states: What went wrong, what can they do?
- Partial states: Some data loaded, some failed
- Permission states: Can't do this, why not?

### 7. Heuristic Evaluation (Nielsen's 10)

Evaluate the design against usability heuristics:
1. Visibility of system status
2. Match with real world
3. User control & freedom
4. Consistency
5. Error prevention
6. Recognition over recall
7. Flexibility
8. Aesthetic & minimal
9. Error recovery
10. Help & documentation

### 8. Visual Design

**Component Selection**
- Which existing components to use
- Any customizations needed
- New components that don't exist yet

**Layout Structure**
- Page layout (sidebar, header, main content)
- Grid/flex structure for content areas
- Spacing and visual hierarchy
- Responsive breakpoints (mobile/tablet/desktop)

**Accessibility Requirements**
- Keyboard navigation flow
- Focus management
- ARIA labels and roles
- Color contrast requirements
- Screen reader considerations

### 9. Open Questions

List any UX decisions that need input.

---

Output a complete UX specification focused on the user experience, not technical implementation."
)
```

### Step 5: Write design.md

Use the Write tool to write to `.workflow/streams/{id}/design.md`
(where `{id}` is `$ARGUMENTS`)
with the following structure:

```markdown
## Design

{agent output from Step 4 - the full 9-section UX specification}

### Review Checklist

- [ ] User goals clearly defined
- [ ] Flow covers happy path and alternatives
- [ ] Edge cases identified
- [ ] Heuristics evaluated
- [ ] Open questions flagged for discussion
```

If design.md already had content (from a previous run), overwrite it.
The latest design is the canonical design.

### Step 6: Present summary

Show the user:

- User flow diagram (text-based)
- Key screens identified
- Open questions requiring decisions
- Heuristic concerns flagged

## Integration with Workflow

```
/plan    -> WHY: Problem + success criteria (plan.md)
          |
/design          -> WHAT: User experience + flows (design.md)
          |
/refine    -> HOW: Technical implementation spec (spec.md)
          |
/build           -> BUILD: Execute the spec (code + commits)
```

## When to Use

- New user-facing features
- Significant UX changes
- Multi-step flows or wizards
- Features where user experience is complex

## When NOT to Use

- Backend-only features
- Simple CRUD with obvious UX
- Bug fixes
- Performance improvements

## Notes

- This is about the USER experience, not the DEVELOPER experience
- The output should be understandable by a non-technical stakeholder
- Design decisions should trace back to user goals
- Re-running `/design` overwrites the existing design.md
