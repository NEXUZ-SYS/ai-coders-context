---
type: skill
name: Pr Review
description: Review pull requests against team standards and best practices
skillSlug: pr-review
phases: [R, V]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Activate this skill during the Review (R) and Verify (V) phases of the PREVC workflow when evaluating a pull request before merge. This applies to:

- Feature branches that introduce new services, generators, or workflow phases.
- Bug fix branches that modify existing logic in `src/services/` or `src/generators/`.
- Refactoring PRs that restructure code without changing behavior.
- Documentation-only changes to `.context/` files.
- Dependency updates or build configuration changes.

## Instructions

1. **Read the PR description and linked issues.** Understand the intent before reading code. Confirm the stated goal aligns with the changes.
2. **Review the diff file by file.** Check each changed file for:
   - Correctness: Does the logic do what it claims? Are edge cases handled?
   - Consistency: Does it follow the `*Dependencies` injection pattern? Are new services injected rather than directly imported?
   - Completeness: Are barrel exports (`index.ts`) updated? Is `codebase-map.json` current?
3. **Verify test coverage.** Confirm that new or modified code paths have corresponding Jest tests. Check that tests mock dependencies through interfaces, not concrete classes.
4. **Check for breaking changes.** If public interfaces (`*Dependencies` types, MCP tool schemas, CLI flags) have changed, verify backward compatibility or confirm that a migration path is documented.
5. **Assess error handling.** Ensure new code uses the structured error types from `src/workflow/errors.ts` and does not swallow exceptions silently.
6. **Validate the PREVC phase alignment.** Confirm the PR corresponds to the correct workflow phase. A PR claiming to be in the Execute phase should not contain unplanned scope changes.
7. **Summarize findings.** Provide a structured review with sections for blockers, suggestions, and approvals. Be explicit about what must change before merge versus what is optional.

## Examples

Reviewing a new service addition:

```markdown
## PR Review: Add ExportService

### Blockers
- `ExportService` imports `SyncService` directly instead of accepting it
  through `ExportServiceDependencies`. This breaks the DI pattern.
  See `src/services/sync/syncService.ts` for the correct approach.

### Suggestions
- Consider adding a timeout parameter to `ExportServiceDependencies.writeFile`
  to handle slow file systems gracefully.
- The test in `exportService.test.ts` only covers the happy path. Add a
  test for the case where `readState()` returns an empty project.

### Approved
- Clean separation of concerns between export formatting and file I/O.
- Barrel export in `src/services/export/index.ts` is correctly updated.
```

Checking dependency injection compliance:

```typescript
// Flag this pattern during review -- direct import of concrete class
import { SemanticAnalyzer } from '../semantic/semanticAnalyzer';

// Recommend this pattern instead -- inject through dependencies
export interface MyServiceDependencies {
  analyzeSemantics: (path: string) => Promise<AnalysisResult>;
}
```

## Guidelines

- Focus review effort proportionally: spend more time on `src/services/` and `src/workflow/` logic than on generated scaffolding or configuration files.
- Do not nitpick formatting if the project has an automated formatter. Reserve human review time for logic, architecture, and correctness.
- When a PR touches Tree-sitter parsing code in `src/services/semantic/`, verify that the test fixtures cover the affected language grammars.
- Flag any new direct file system access that bypasses the injected `*Dependencies` interface. All I/O should be mockable for testing.
- Confirm that the PR does not introduce circular dependencies between service directories. Each service should depend only on its own types and explicitly injected collaborators.
- For PRs that modify the PREVC workflow orchestration in `src/workflow/`, verify that phase gates still enforce their preconditions correctly.
- Be constructive. Frame feedback as questions or suggestions when the issue is subjective. Reserve imperative language for clear violations of project conventions.
