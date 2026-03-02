---
type: skill
name: Bug Investigation
description: Systematic bug investigation and root cause analysis
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Invoke this skill during the **Execute** phase to investigate and fix bugs, and during the **Verify** phase to confirm the fix resolves the issue without regressions. Use it when:

- A bug report or failing test needs root cause analysis.
- An error occurs during CLI execution, scaffold generation, or AI-agent-driven fill operations.
- Tree-sitter semantic analysis produces unexpected results or crashes.
- A service behaves differently than its `*Dependencies` interface contract specifies.
- Tests pass locally but fail in CI, or vice versa.

## Instructions

1. **Reproduce the bug.** Run the exact command or test that triggers the issue. Record the full error output, including stack traces.
   - For CLI bugs: run with `--verbose` if available, or set `DEBUG=*` for additional output.
   - For test failures: run `npx jest <path-to-test> --verbose` to get detailed assertion output.
2. **Isolate the scope.** Trace the error to a specific layer:
   - **CLI layer** (`src/index.ts`, command handlers) -- argument parsing or option wiring issues.
   - **Service layer** (`src/services/`) -- business logic, dependency injection, or async flow errors.
   - **Generator layer** (`src/generators/`) -- template rendering, frontmatter, or file I/O problems.
   - **Workflow layer** (`src/workflow/`) -- PREVC phase transitions, gate validation, or orchestrator state.
   - **Utility layer** (`src/utils/`) -- shared helpers like `frontMatter.ts`, `fileMapper.ts`, or `cliUI.ts`.
3. **Trace the call chain.** Follow the execution path from entry point to the failure site. Pay attention to:
   - Dependency injection: verify that the `*Dependencies` object passed to the service constructor contains all required properties with correct types.
   - Async operations: check for unhandled promise rejections or missing `await` keywords.
   - File system operations: confirm paths are resolved correctly (the project uses `fs-extra` and `path.resolve`).
4. **Identify the root cause.** Distinguish between symptoms and the actual defect. Common root causes in this codebase:
   - Frontmatter parsing edge cases in `src/utils/frontMatter.ts`.
   - Glob pattern mismatches in file discovery.
   - Tree-sitter parser version incompatibilities with Node.js ABI.
   - Missing or incorrect scaffold structure definitions in `src/generators/shared/scaffoldStructures.ts`.
5. **Implement the fix.** Make the minimal change necessary. Ensure the fix addresses the root cause, not just the symptom.
6. **Write a regression test.** Add a test case in the relevant `*.test.ts` file that reproduces the original bug and verifies the fix.
7. **Verify no regressions.** Run the full test suite with `npm test` to confirm nothing else broke.

## Examples

Investigating a frontmatter parsing failure:

```typescript
// Reproduce: fill command fails with "Cannot read properties of undefined"
// Stack trace points to parseFrontMatter in src/utils/frontMatter.ts

// Step 1: Isolate the input
const input = fs.readFileSync(problematicFile, 'utf-8');
console.log('Raw frontmatter:', input.slice(0, 200));

// Step 2: Test the parser directly
import { parseFrontMatter } from '../../utils/frontMatter';
const result = parseFrontMatter(input);
// Result: { status: undefined } -- the YAML has a missing field

// Step 3: Fix -- add a default value guard
const status = result.status ?? 'unfilled';
```

Debugging a dependency injection issue in a service:

```typescript
// Error: "TypeError: this.deps.cli.info is not a function"
// Root cause: the CLIInterface mock in tests is incomplete

// Fix in the test file:
const mockCli: CLIInterface = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  // ... all required methods from the interface
};

const service = new FillService({
  cli: mockCli,
  fs: mockFs,
  // ... other dependencies
});
```

## Guidelines

- Always reproduce before investigating. Do not guess at root causes based on the error message alone.
- Follow the dependency chain. This codebase uses explicit dependency injection, so the call chain is traceable through constructor parameters and interface contracts.
- Check `src/services/shared/types.ts` for `BaseDependencies` and `AIDependencies` when investigating service initialization failures.
- When the bug involves file system operations, verify paths with `path.resolve` and confirm the working directory context. The project operates on repository root paths passed through service constructors.
- For Tree-sitter related bugs, verify parser binary compatibility with the current Node.js version. Run `npm install` to rebuild binaries if needed.
- Every bug fix must include a regression test. A fix without a test is incomplete.
- Prefer minimal, targeted fixes. Avoid refactoring adjacent code in a bug-fix commit -- that belongs in a separate task.
- Document the root cause in the commit message body so future agents understand *why* the bug occurred.
