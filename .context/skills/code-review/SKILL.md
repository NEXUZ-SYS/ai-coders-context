---
type: skill
name: Code Review
description: Review code quality, patterns, and best practices
skillSlug: code-review
phases: [R, V]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Invoke this skill during the **Review** phase to evaluate code quality before execution begins, and during the **Verify** phase to validate that implemented code meets project standards. Use it when:

- A pull request or set of changes needs quality review.
- New services, generators, or workflow components are introduced.
- Refactored code needs validation against existing patterns.
- You need to verify adherence to the dependency injection pattern and TypeScript conventions.
- Test coverage and quality for changed code needs assessment.

## Instructions

1. **Understand the change intent.** Read the PR description, linked issue, or task context to understand what the change is supposed to accomplish before evaluating how it does so.
2. **Review structural compliance.** Verify that new code follows the established project layout:
   - Services belong in `src/services/<domain>/` with an `index.ts` barrel export.
   - Generators belong in `src/generators/<type>/` with template subdirectories.
   - Workflow logic belongs in `src/workflow/`.
   - Shared utilities belong in `src/utils/`.
3. **Check the dependency injection pattern.** For any new or modified service class:
   - Confirm a `*Dependencies` interface is defined listing all external dependencies.
   - Confirm the constructor accepts a single `deps` parameter typed to the interface.
   - Confirm no service directly imports and instantiates another service (use the injected dependency instead).
   - Check if the interface extends `BaseDependencies` or `AIDependencies` from `src/services/shared/types.ts` where appropriate.
4. **Evaluate TypeScript quality.**
   - No use of `any` without explicit justification.
   - Interfaces and types are preferred over inline type annotations for complex shapes.
   - Exported symbols have clear, descriptive names.
   - Async functions use proper `await` and error handling.
5. **Assess test coverage.**
   - New public methods have corresponding unit tests in a colocated `*.test.ts` file.
   - Tests use Jest with `jest.fn()` mocks for dependencies, not real implementations.
   - Edge cases and error paths are tested, not just the happy path.
   - Integration tests exist for cross-service flows if applicable.
6. **Check for regressions.** Verify that existing tests still pass and that no existing behavior was unintentionally changed.
7. **Review documentation impact.** If the change affects the public API, CLI interface, or project structure, confirm that `.context/docs/` or relevant documentation has been updated.

## Examples

Reviewing a new service for pattern compliance:

```typescript
// GOOD: follows the dependency injection pattern
interface SyncServiceDependencies {
  fs: typeof import('fs-extra');
  cli: CLIInterface;
  fileMapper: FileMapper;
}

export class SyncService {
  constructor(private readonly deps: SyncServiceDependencies) {}

  async syncContext(repoPath: string): Promise<void> {
    const files = await this.deps.fileMapper.mapFiles(repoPath);
    this.deps.cli.info(`Found ${files.length} files`);
    // ...
  }
}
```

```typescript
// BAD: direct imports instead of injection
import { FileMapper } from '../../utils/fileMapper';
import { CLIInterface } from '../../utils/cliUI';

export class SyncService {
  private fileMapper = new FileMapper(); // not injected
  async syncContext(repoPath: string): Promise<void> {
    // untestable -- cannot mock FileMapper
  }
}
```

Flagging missing test coverage:

```markdown
**Review comment**: The new `exportYaml` method in `ContextExportService`
has no test coverage. Add a test in `contextExportService.test.ts` that:
- Verifies YAML output structure matches the expected schema.
- Tests the error path when the serializer receives invalid input.
- Mocks `fs.writeFile` to confirm the correct output path is used.
```

## Guidelines

- Review for correctness first, style second. A working solution with minor style issues is better than a blocked PR over formatting preferences.
- Always check the `*Dependencies` interface pattern. This is the single most important architectural convention in the codebase, and deviations from it make services untestable.
- Verify that `fs-extra` is used instead of the native `fs` module. The project standardizes on `fs-extra` for file operations.
- Look for proper use of the `frontMatter` utilities from `src/utils/frontMatter.ts` when code reads or writes Markdown files with YAML headers. Direct YAML parsing should go through these shared functions.
- Check that new generators register their scaffold structures in `src/generators/shared/structures/` and expose them through the registry.
- For workflow changes, verify that PREVC phase transitions are handled through the `PrevcOrchestrator` and respect existing gate validations in `src/workflow/gates/`.
- When reviewing test files, confirm mocks are properly typed. A `jest.fn()` mock should satisfy the full interface contract, not just the methods called in the specific test.
- Do not approve changes that reduce test coverage without explicit justification.
- Flag any hardcoded file paths. The project uses `path.resolve` and `path.join` for cross-platform compatibility.
