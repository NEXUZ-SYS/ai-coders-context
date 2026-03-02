---
type: skill
name: Test Generation
description: Generate comprehensive test cases for code
skillSlug: test-generation
phases: [E, V]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Activate this skill during the Execute (E) and Verify (V) phases of the PREVC workflow when you need to create or expand automated tests. Common triggers include:

- A new service or generator has been implemented and lacks test coverage.
- An existing module is being modified and its tests need updating to reflect new behavior.
- A bug has been fixed and a regression test is required to prevent recurrence.
- The Verify phase gate requires proof that all acceptance criteria are covered by tests.
- Code coverage for a module in `src/services/` or `src/generators/` falls below the project threshold.

## Instructions

1. **Identify the test subject.** Determine the exact module, class, or function under test. Locate its `*Dependencies` interface to understand what collaborators need to be mocked.
2. **Create the test file.** Place it alongside the source file or in a `__tests__/` directory following the existing convention: `<module>.test.ts`.
3. **Mock dependencies, not implementations.** Build mock objects that satisfy the `*Dependencies` interface. Use Jest's `jest.fn()` for individual functions. Never mock internal private methods.
4. **Structure tests with describe/it blocks.** Group tests by method or behavior. Use descriptive `it` strings that read as complete sentences (e.g., `it('should return an error when the file path is invalid')`).
5. **Cover the critical paths:**
   - Happy path with valid inputs.
   - Edge cases (empty inputs, boundary values, large datasets).
   - Error paths (invalid arguments, dependency failures, permission errors).
   - Integration with Tree-sitter parsing where applicable (use real fixture files from `__fixtures__/`).
6. **Assert on behavior, not implementation.** Verify return values and side effects (calls to dependency functions), not internal state.
7. **Run the tests.** Execute `npm test -- --testPathPattern=<your-test-file>` to confirm they pass, then run the full suite with `npm test` to ensure no regressions.

## Examples

Testing a service that uses dependency injection:

```typescript
// src/services/sync/__tests__/syncService.test.ts
import { SyncService } from '../syncService';
import { SyncServiceDependencies } from '../types';

describe('SyncService', () => {
  let deps: jest.Mocked<SyncServiceDependencies>;
  let service: SyncService;

  beforeEach(() => {
    deps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      logger: { info: jest.fn(), error: jest.fn() },
    };
    service = new SyncService(deps);
  });

  it('should write the synced output to the target path', async () => {
    deps.readFile.mockResolvedValue('source content');

    await service.sync({ source: '/a.md', target: '/b.md' });

    expect(deps.writeFile).toHaveBeenCalledWith(
      '/b.md',
      expect.stringContaining('source content')
    );
  });

  it('should propagate read errors with a descriptive message', async () => {
    deps.readFile.mockRejectedValue(new Error('ENOENT'));

    await expect(service.sync({ source: '/missing.md', target: '/b.md' }))
      .rejects.toThrow(/ENOENT/);
  });
});
```

Testing a generator with fixture files:

```typescript
// src/generators/skills/__tests__/skillGenerator.test.ts
import { SkillGenerator } from '../skillGenerator';
import path from 'path';

describe('SkillGenerator', () => {
  it('should produce valid markdown with frontmatter', async () => {
    const result = await generator.generate({
      name: 'test-skill',
      phases: ['E'],
    });

    expect(result).toMatch(/^---\n/);
    expect(result).toContain('skillSlug: test-skill');
  });
});
```

## Guidelines

- Every test file must be self-contained. Shared setup should live in `beforeEach` blocks, not in module-level mutable state.
- Use `jest.Mocked<T>` to type mock objects so TypeScript catches mismatches between the mock and the real interface.
- Avoid snapshot tests for anything other than stable, serializable output (like generated markdown). Snapshots that change frequently add noise rather than confidence.
- When testing Tree-sitter-dependent code in `src/services/semantic/`, use small but realistic fixture files rather than inline strings. Store them in a `__fixtures__/` directory next to the test.
- Keep individual test cases focused on a single assertion or a tightly related group of assertions. A test that checks five unrelated properties is hard to diagnose when it fails.
- During the Verify phase, confirm that new tests actually fail when the feature is reverted. A test that always passes regardless of the code change provides no value.
- Prefer `toHaveBeenCalledWith` over `toHaveBeenCalled` to verify that dependencies receive the correct arguments, not just that they were invoked.
