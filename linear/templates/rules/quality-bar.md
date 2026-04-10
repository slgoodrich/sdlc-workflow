# AI Agent Code Quality Guide

A generalized decision framework for AI coding agents. Structured as decision gates and prohibited patterns rather than philosophical principles.

**Goal**: Production-grade code meeting senior engineer standards.

---

## Pre-Flight Checks (Before Writing Any Code)

Run these checks before implementing any solution:

- [ ] Can I solve this with existing code without modifications?
- [ ] Can I solve this by modifying existing code instead of adding new code?
- [ ] Have I read all relevant existing code first?
- [ ] Do I understand the existing patterns in this codebase?
- [ ] Is there a standard library solution I should use instead?

**Default behavior**: Prefer editing over creating. Prefer stdlib over custom. Prefer existing patterns over new ones.

---

## 1. Complexity Decision Gate

**Before adding any of these, check this gate:**
- New class
- New abstraction (interface, abstract class, generic)
- New configuration option
- New utility/helper function
- New design pattern

**Decision gate:**
- [ ] Do I have 3+ concrete use cases right now? (List them)
- [ ] Can I explain why this complexity is necessary in one sentence?
- [ ] Does this eliminate duplication AND improve clarity? (both required)
- [ ] Will this make the code easier to delete later?

**If any answer is NO**: Use direct code instead (functions, not classes; inline code, not utilities; hardcode, not configure).

<!-- CUSTOMIZE: Add project-specific complexity rules -->

---

## 2. Coupling and Deletion Check

**Before creating any module/component, check:**
- [ ] Can this be removed in <10 minutes without cascading changes?
- [ ] Are all dependencies explicit (parameters/imports, not global state)?
- [ ] Does this have exactly one reason to change?
- [ ] Could I copy this to another project without bringing dependencies?

**If any answer is NO**: Redesign to isolate concerns.

**Prohibited patterns:**
- Circular dependencies
- Shared mutable state
- God objects (classes with 10+ methods)
- Hidden dependencies (global variables, singletons)

<!-- CUSTOMIZE: Add project-specific coupling rules -->

---

## 3. Structure Over Validation

**Before adding validation logic, check:**
- [ ] Is this a system boundary? (user input, external API, file I/O)
- [ ] Can I use types/structure to make this error impossible? (union types, branded types, enums)
- [ ] Am I validating the same thing in multiple places?

**Decision tree:**
- **System boundary** (user input, API requests): Validate thoroughly, fail with helpful error
- **Internal code**: Trust the types, don't validate
- **Impossible state**: Restructure types so it can't happen

**If you write "this should never happen"**: Restructure so it can't happen, don't add an assertion.

**Prohibited patterns:**
- Null checks throughout codebase (validate at boundary instead)
- Defensive programming everywhere (trust internal code)
- Assertions in business logic (fix the types)

<!-- CUSTOMIZE: Add project-specific validation rules -->

---

## 4. Naming and Clarity Check

**Before committing any code, verify:**
- [ ] Every name precisely describes its purpose (no temp, data, result, info, manager, helper, utils without context)
- [ ] Every function does exactly one thing that matches its name
- [ ] Comments explain WHY (the decision, the tradeoff), not WHAT (the code does)
- [ ] A developer unfamiliar with this code could understand it in 30 seconds

**Naming decision tree:**
- Generic term (data, result, info)? -> Be specific about what it contains
- Ends in Manager/Helper/Util? -> Describe what it manages/helps/does
- Needs a comment to explain? -> Rename instead

**Prohibited patterns:**
- Variables named: data, result, temp, info, obj, item (without context)
- Classes ending in: Manager, Helper, Utility, Base, Abstract (without specific purpose)
- Comments that restate code: `// Loop through items` above `for (const item of items)`
- Functions >50 lines (break into smaller functions)

**Naming conventions:**
- `camelCase` for functions/variables
- `PascalCase` for classes, interfaces, types
- `UPPER_SNAKE_CASE` for constants

<!-- CUSTOMIZE: Add project-specific naming conventions and domain language -->

---

## 5. Error Handling Decision Tree

**Decision tree for error handling:**

1. **Can this error actually occur?**
   - Theoretical only -> Don't handle it
   - Can actually happen -> Continue to step 2

2. **Is this a system boundary?** (user input, API requests, file I/O, database)
   - Yes -> Validate thoroughly, provide helpful error message
   - No (internal code) -> Let it fail naturally

3. **Can the caller recover from this error?**
   - Yes -> Return error/result type, let caller decide
   - No -> Fail fast with context (what failed, what input, where)

**Error message requirements:**
- What failed
- What input caused the failure
- Where it failed (stack trace with context)
- How to fix it (if user-facing)

**Prohibited patterns:**
- Silent failures (catching and ignoring errors)
- Generic errors: "Error occurred", "Invalid input" (be specific)
- Continuing with corrupted state after error
- Error handling for scenarios that can't happen

<!-- CUSTOMIZE: Add project-specific error patterns -->

---

## 6. Performance Awareness Check

**Before choosing data structures or algorithms:**
- [ ] What's the Big-O complexity of this operation?
- [ ] What's the expected scale (10 items? 1000? 1 million?)
- [ ] Am I choosing appropriate data structures? (Map for lookup, Set for membership, Array for ordering)
- [ ] Am I allocating in tight loops when I could allocate once?

**Decision tree:**
- Unbounded input + O(n^2) algorithm -> Find O(n log n) or O(n) solution
- Loading entire dataset into memory -> Stream or paginate
- Obvious inefficiency (linear scan when Map exists) -> Fix it
- Micro-optimization (inline function) -> Don't do it

**Prohibited patterns:**
- Linear scan when hash lookup exists
- Loading unbounded data into memory
- O(n^2) on unbounded input
- Premature micro-optimization

<!-- CUSTOMIZE: Add project-specific performance requirements and targets -->

---

## 7. Ecosystem Compatibility Check

**Before writing any code:**
- [ ] Does this follow the language's idioms?
- [ ] Am I using stdlib patterns instead of reinventing?
- [ ] Does this match existing codebase conventions exactly?
- [ ] Would an expert in this language recognize this as idiomatic?

**Prohibited patterns:**
- Reinventing stdlib (custom date parsing, JSON handling, etc.)
- Fighting the framework (working around instead of with)
- Mixing conventions (camelCase and snake_case in same file)
- Java-style TypeScript, Python-style TypeScript, etc.

<!-- CUSTOMIZE: Add project-specific conventions and library usage rules -->

---

## 8. Abstraction Justification Gate

**Before creating abstraction (interface, abstract class, generic function):**
- [ ] Do I have concrete evidence of variation, not theoretical possibility?
- [ ] Can I list 3+ concrete use cases that exist right now?
- [ ] Does the abstraction match the problem domain's actual axis of change?
- [ ] Is the abstraction obvious to someone who knows the domain?
- [ ] Can I explain this without using the word "flexible" or "future-proof"?

**If any answer is NO**: Write concrete code. Wait for third use case to abstract.

**Rule of three**: Don't abstract until you have 3 concrete instances. Then abstract the proven pattern.

**Prohibited patterns:**
- Abstraction "for future flexibility"
- Base classes with one subclass
- Generic/flexible/extensible without concrete use cases
- AbstractSingletonProxyFactoryBean-style over-engineering

<!-- CUSTOMIZE: Add project-specific abstraction rules and architecture layers -->

---

## 9. Design for Testability Check

**Before writing implementation:**
- [ ] Can I test the core logic without mocking everything?
- [ ] Are dependencies explicit (parameters) not implicit (globals, singletons)?
- [ ] Is pure logic separated from side effects?
- [ ] Can I test edge cases without complex setup?

**If testing feels hard**: The design is probably wrong. Refactor to separate concerns.

**Test coverage requirements:**
- Core logic and edge cases: yes
- Error paths: yes
- Getters/setters: no
- Implementation details: no

**Prohibited patterns:**
- Testing implementation details instead of behavior
- Mocking everything (indicates tight coupling)
- 100+ line test setup (indicates poor design)
- Brittle tests that break on refactoring

<!-- CUSTOMIZE: Add project-specific testing rules -->

---

## 10. Completeness Check

**Before marking work complete:**
- [ ] Error handling is complete (not just happy path)
- [ ] Edge cases are handled (empty input, null, boundary conditions)
- [ ] Configuration works as documented
- [ ] Logging is present and useful
- [ ] Performance meets requirements (measured, not assumed)
- [ ] No TODO comments or debug console.log statements
- [ ] Documentation is updated

**Prohibited patterns:**
- Shipping with TODO comments
- Debug console.log statements left in code
- "Good enough for now" implementations
- Unhandled edge cases
- Untested error paths

<!-- CUSTOMIZE: Add project-specific completeness requirements -->

---

## Prohibited Patterns (Universal)

**Never do these:**
- Create helper/utility/manager classes without specific purpose
- Add flexibility for theoretical future requirements
- Create abstraction before third concrete use case
- Reinvent stdlib functionality
- Add error handling for impossible scenarios
- Continue execution after encountering corrupted state
- Use generic variable names (data, result, temp) without context
- Write comments that restate what code does
- Commit code with TODO, FIXME, or debug statements
- Create circular dependencies
- Hide complexity instead of eliminating it
- Optimize before measuring
- Skip validation at system boundaries
- Validate everywhere internally

---

## Before Shipping

Production-grade means:
- Edge cases handled
- Errors are helpful
- Performance measured and meets targets
- Tests pass with >80% coverage
- Documentation is clear
- No TODOs or debug code
- Idiomatic and maintainable

---

## Usage Instructions for AI Agents

1. **Before writing any code**: Run pre-flight checks
2. **Before adding complexity**: Run complexity decision gate
3. **While writing code**: Check naming, structure, and ecosystem compatibility
4. **Before committing**: Run completeness check
5. **When uncertain**: Err on the side of simplicity and directness

**Remember**: The default answer is "don't add it." Complexity requires justification. Simplicity requires no explanation.
