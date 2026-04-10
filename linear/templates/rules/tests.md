# Testing Standards

## Framework

<!-- CUSTOMIZE: Run /customize to set your test framework and runner -->
- Single test config at project root

## What to Test

### Always test

- Core logic (business rules, data transformations, state management)
- Error paths (invalid input, missing resources, corrupt state)
- Edge cases (empty strings, boundary values, unicode, concurrent access)

<!-- CUSTOMIZE: Add project-specific test targets (API handlers, CLI commands, etc.) -->

### Don't test

- Type definitions and interfaces (TypeScript handles this)
- Re-exported modules with no logic
- Third-party library behavior
- Build output

## File Structure

<!-- CUSTOMIZE: Add your project's test file structure -->

Tests live in `__tests__/` directories next to the code they test. Test files mirror source file names with `.test.ts` suffix.

## Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('functionName', () => {
  it('does the expected thing for normal input', () => {
    // arrange, act, assert
  });

  it('returns error for invalid input', () => {
    // test the error path
  });

  it('handles edge case: empty string', () => {
    // boundary condition
  });
});
```

Rules:

- One `describe` per function or logical group
- `it` descriptions state the expected behavior, not the implementation
- No `test()` - use `it()` for consistency
- No nested `describe` blocks deeper than 2 levels
- No `beforeEach`/`afterEach` unless genuinely shared setup across 3+ tests

## Database Testing

- Use in-memory databases or temp directories for test isolation
- Run migrations in test setup to get a real schema
- Clean up temp dirs in afterEach
- Never test against the live database

## Mocking

- Mock external services at the module boundary
- Never mock the function under test
- Prefer dependency injection over `vi.mock()` when possible
- If `vi.mock()` is needed, mock the minimal surface area
- For databases: prefer real in-memory instances over mocks

## Coverage

- Target: >80% on all source code
- Don't chase 100%. Cover behavior, not lines.
- Every error path that can actually occur must have a test.
- Performance tests use relaxed thresholds to avoid flakiness on slow machines.

## Prohibited

- `any` in test files (type your mocks properly)
- `console.log` for debugging (use verbose reporter instead)
- Tests that pass without assertions (`it('works', () => {})`)
- Tests that test the mock instead of the code
- Snapshot tests for non-UI code
- `skip` or `todo` markers committed to main
