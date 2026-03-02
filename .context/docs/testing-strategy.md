---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Testing Strategy

Quality is maintained through a comprehensive test suite using Jest. The codebase uses unit tests for individual services and integration tests for end-to-end flows. Tests are colocated with source files using the `*.test.ts` naming convention, with some integration tests in `__tests__` directories.

## Test Types

- **Unit**: Jest, files named `*.test.ts` colocated with source files
- **Integration**: Files named `*.integration.test.ts`, test full service flows
- **Shared test utilities**: Located in `src/services/shared/__tests__/`

## Running Tests

- All tests: `npm test`
- Watch mode: `npx jest --watch`
- Single file: `npx jest <path-to-test>`
- Coverage: `npx jest --coverage`
- Verbose: `npx jest --verbose`

## Quality Gates

- All tests must pass before merging PRs
- New features require corresponding tests
- Service classes should have unit tests for public methods
- Integration tests for cross-service workflows
- CI runs the full test suite on every PR

## Troubleshooting

- Tests that interact with the file system use temporary directories and clean up after themselves
- AI-dependent tests may need mock providers configured
- Tree-sitter tests require the parser binaries to be installed (`npm install` handles this)
- Long-running semantic analysis tests can be filtered with `--testPathIgnorePatterns`

See [Development Workflow](./development-workflow.md) for the overall contribution process.
