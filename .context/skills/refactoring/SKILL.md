---
type: skill
name: Refactoring
description: Safe code refactoring with step-by-step approach
skillSlug: refactoring
phases: [E]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Activate this skill during the Execute (E) phase of the PREVC workflow when you need to restructure existing code without changing its external behavior. Common triggers include:

- A service class in `src/services/` has grown beyond a single responsibility.
- A `*Dependencies` interface has accumulated unrelated methods, signaling the owning module needs decomposition.
- Duplicated logic exists across multiple generators in `src/generators/`.
- A function exceeds roughly 50 lines or has deeply nested control flow.
- Test files reveal tight coupling that makes unit testing difficult.

Do not use this skill for feature additions or bug fixes that intentionally change behavior. Those belong to the Feature Development or Bug Investigation skills.

## Instructions

1. **Identify the refactoring scope.** Pin down the exact files, classes, or functions that will change. List them explicitly before making any edits.
2. **Verify test coverage.** Run the existing Jest test suite (`npm test`) for the affected modules. If coverage is insufficient, write characterization tests first to lock in current behavior.
3. **Apply one transformation at a time.** Each commit should represent a single, self-contained refactoring step (extract method, move class, rename interface, etc.). Never combine multiple refactoring moves into one commit.
4. **Preserve the `*Dependencies` injection pattern.** When extracting a new service, define a corresponding `*Dependencies` interface in the same file or a co-located `types.ts`. Inject it through the constructor, matching the convention used throughout `src/services/`.
5. **Update barrel exports.** If you move or rename a module, update the relevant `index.ts` barrel files so that imports across the project continue to resolve.
6. **Run the full test suite after each step.** Confirm zero regressions with `npm test` before proceeding to the next transformation.
7. **Update `codebase-map.json`.** If the refactoring changes file locations or module boundaries, reflect those changes in `.context/docs/codebase-map.json`.

## Examples

Extracting a helper out of a bloated service:

```typescript
// BEFORE: src/services/sync/syncService.ts
export class SyncService {
  constructor(private deps: SyncServiceDependencies) {}

  async sync() {
    // ...100 lines of diffing logic mixed with file I/O...
  }
}

// AFTER: src/services/sync/diffCalculator.ts
export interface DiffCalculatorDependencies {
  readFile: (path: string) => Promise<string>;
}

export class DiffCalculator {
  constructor(private deps: DiffCalculatorDependencies) {}

  calculate(source: string, target: string): DiffResult {
    // Pure diffing logic extracted here
  }
}

// AFTER: src/services/sync/syncService.ts
export class SyncService {
  constructor(private deps: SyncServiceDependencies) {}

  async sync() {
    const diff = this.deps.diffCalculator.calculate(source, target);
    // File I/O only
  }
}
```

Renaming a dependency interface to match the new class name:

```bash
# Use a project-wide find-and-replace, then run tests
grep -r "OldDependencies" src/ --files-with-matches
# Update each file, then verify
npm test
```

## Guidelines

- Never refactor and change behavior in the same commit. Separate structural changes from functional changes.
- Prefer small, reversible steps. If a refactoring feels risky, break it into smaller sub-steps.
- Keep the dependency injection pattern consistent: every service gets its dependencies through a constructor-injected interface, never through direct imports of concrete implementations.
- Avoid renaming public API surface (exported functions, CLI flags, MCP tool names) without a corresponding deprecation plan.
- When moving files between directories under `src/services/` or `src/generators/`, check for path-dependent logic in the build configuration (`tsconfig.json`) and test configuration (`jest.config.*`).
- If Tree-sitter parsing modules under `src/services/semantic/` are involved, test against real-world codebases, not just unit fixtures, since AST-level changes can have subtle downstream effects.
