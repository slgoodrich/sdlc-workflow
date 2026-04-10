# Error Handling and Pattern Consistency

## Pattern Fix Completeness

**When you identify a problematic pattern in the codebase:**

1. **Don't perpetuate it** - Fix the pattern, don't copy it to new code
2. **Fix comprehensively** - If fixing in one place, fix in all places it appears
3. **Fix proactively** - Don't wait to be asked; if you see it, fix it
4. **Document if blocked** - If you can't fix everything, create a TODO or issue tracking remaining instances

**Examples of patterns to fix comprehensively:**

- Missing error handling (add try/catch blocks everywhere needed)
- Inconsistent validation (validate at all boundaries, not just one)
- Unsafe operations (fix all instances of the unsafe pattern)
- Performance issues (if one query needs optimization, check others)
- Security vulnerabilities (if one endpoint is vulnerable, audit all similar endpoints)

**Red flags that trigger comprehensive fixes:**

- "This is the same pattern as the other function" -> Fix both
- "I'll handle errors here like they do elsewhere" -> Check if elsewhere is correct first
- "This isn't ideal but matches existing code" -> Fix the existing code too
- "I noticed X is also broken" -> Fix X while you're at it

## Error Handling Principles

**At system boundaries** (user input, API requests, file I/O, database):
- Validate thoroughly
- Provide helpful error messages (what failed, why, how to fix)
- Never expose internal errors to users
- Log with context for debugging

**In internal code**:
- Trust your types and contracts
- Don't validate what can't happen
- Let errors propagate with context
- Use custom error classes for domain errors

**Never**:
- Silently catch and ignore exceptions
- Use generic error messages ("Error occurred", "Invalid input")
- Continue execution with corrupted state
- Add error handling for theoretical scenarios that can't actually occur

## Leave Code Better Than You Found It

If you touch a file and notice:
- Missing error handling -> Add it
- Inconsistent patterns -> Make them consistent
- Bad practices -> Fix them
- Unclear code -> Refactor it

**Exception**: If the fix is large enough to warrant its own task/PR, document it and move on. But small improvements should be made immediately.

## Resource Cleanup on Error Paths

**Always use try/finally for resources that need cleanup:**

```typescript
// GOOD: Cleanup guaranteed
const resource = acquire(path);
try {
  doWork(resource);
} finally {
  resource.close();
}

// BETTER: Use a wrapper that handles cleanup
function withResource<T>(path: string, fn: (r: Resource) => T): T {
  const resource = acquire(path);
  try {
    return fn(resource);
  } finally {
    resource.close();
  }
}
```

**For file operations, use atomic writes:**

```typescript
// GOOD: Atomic write (temp + rename)
import { writeFileSync, renameSync } from 'node:fs';

function atomicWrite(filePath: string, content: string): void {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, content);
  renameSync(tmpPath, filePath);
}
```

**Red flags:**
- Manual resource cleanup without try/finally
- Connections opened but never closed on error paths
- Temp files created but not cleaned up on failure
- Any code that says "remember to cleanup" in comments

## Testing Error Paths

**Every error path must have a test. If the code can throw, test that it does:**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('config write', () => {
  it('throws when disk is full', () => {
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('ENOSPC: No space left on device');
    });

    expect(() => writeConfig(configPath, config))
      .toThrow(DiskFullError);
  });
});
```

**What to test:**

1. **Expected errors are thrown**
2. **Error messages are helpful** (contain relevant context)
3. **Cleanup happens on error** (no leaked resources or temp files)
4. **State remains consistent after error** (transactions rolled back)

**Red flags:**
- Only testing the happy path
- Tests that pass by accident (error thrown but not asserted)
- Mock errors but don't verify handling
- Error tests marked as "TODO"

## Error Context Preservation

**When wrapping errors, preserve the original with `cause`:**

```typescript
// GOOD: Preserves full stack trace and context
try {
  const config = JSON.parse(content);
} catch (e) {
  throw new ConfigError(`Invalid JSON in ${configPath}: ${e}`, { cause: e });
}

// BAD: Loses original error context
try {
  const config = JSON.parse(content);
} catch {
  throw new ConfigError('Invalid JSON');
}
```

**Include relevant state in error messages:**

```typescript
// GOOD: Tells you what failed and why
throw new ConfigError(
  `Failed to write config to ${configPath}: ${e}. ` +
  `Key: ${config.key}, Version: ${config.version}`
);

// BAD: Vague, unhelpful
throw new ConfigError('Write failed');
```

**When NOT to wrap errors:**

```typescript
// If the error is already clear and actionable, let it propagate
function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf-8'); // ENOENT is clear enough
}

// Only wrap if adding valuable context
function readConfig(filePath: string): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigError(
        `Config not found at ${filePath}. Run setup first.`,
        { cause: e }
      );
    }
    throw e;
  }
}
```

**Red flags:**
- `catch (e) {}` without re-throwing or context
- Error messages that just say "Error" or "Failed"
- Catching specific errors but throwing generic ones
- Losing the original error (no `cause`)
- Error messages that don't help you fix the problem
