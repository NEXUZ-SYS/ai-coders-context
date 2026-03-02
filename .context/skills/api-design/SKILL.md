---
type: skill
name: Api Design
description: Design RESTful APIs following best practices
skillSlug: api-design
phases: [P, R]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Activate this skill during the Plan (P) and Review (R) phases of the PREVC workflow when designing or evaluating programmatic interfaces. This applies to:

- New MCP server tool definitions exposed via `src/services/mcp/`.
- CLI command interfaces defined through the command registry.
- Internal service interfaces (`*Dependencies` types) that act as contracts between modules.
- Any public API surface that external consumers or other AI agents will call.

Do not use this skill for purely internal helper functions that have a single call site and no stability guarantees.

## Instructions

1. **Start with the consumer's perspective.** Before writing any implementation, define the input types, output types, and error cases from the caller's point of view. Write these as TypeScript interfaces first.
2. **Follow consistent naming conventions.** Use verb-noun patterns for MCP tools and CLI commands (e.g., `sync-context`, `generate-docs`). Use noun-based names for service interfaces (e.g., `SyncServiceDependencies`).
3. **Design for dependency injection.** Every new service must accept its collaborators through a `*Dependencies` interface. Never import concrete service classes directly inside another service.
4. **Define explicit error types.** Use the error hierarchy established in `src/workflow/errors.ts`. Return structured error objects rather than throwing raw strings.
5. **Keep payloads minimal.** Input parameters and return types should carry only the data the caller needs. Avoid passing entire configuration objects when a subset of fields suffices.
6. **Document the contract.** Add JSDoc comments to every exported interface describing its purpose, parameters, and expected behavior. Include `@example` tags where the usage is non-obvious.
7. **Version considerations.** If changing an existing public interface, assess backward compatibility. Prefer additive changes (new optional fields) over breaking changes.

## Examples

Defining a new MCP tool interface:

```typescript
// src/services/mcp/tools/analyzeStructure.ts

export interface AnalyzeStructureInput {
  /** Absolute path to the project root */
  projectPath: string;
  /** Glob patterns to exclude from analysis */
  excludePatterns?: string[];
}

export interface AnalyzeStructureOutput {
  /** Map of directory paths to their contained modules */
  modules: Record<string, ModuleInfo>;
  /** Total files analyzed */
  fileCount: number;
}

export interface AnalyzeStructureDependencies {
  semanticAnalyzer: SemanticAnalyzer;
  fileSystem: FileSystemReader;
}
```

Designing a service dependency interface:

```typescript
// src/services/export/types.ts

export interface ExportServiceDependencies {
  readState: () => Promise<ProjectState>;
  writeFile: (path: string, content: string) => Promise<void>;
  logger: Logger;
}

// Consumer injects concrete implementations at construction time
const service = new ExportService({
  readState: stateManager.read.bind(stateManager),
  writeFile: fs.writeFile,
  logger: consoleLogger,
});
```

## Guidelines

- Treat every `*Dependencies` interface as a public API contract, even when it is internal. Changing it affects every consumer and every test mock.
- Prefer a small number of well-defined parameters over a single options bag with many optional fields. If an options object has more than five fields, consider whether the function is doing too much.
- MCP tool definitions must include a clear `description` field that AI agents can use to decide when to invoke the tool. Write descriptions as imperative sentences (e.g., "Analyze the directory structure of a project").
- When reviewing API designs in the R phase, check for: consistent error handling, absence of leaked implementation details in return types, and alignment with existing patterns in `src/services/`.
- Avoid boolean flags that switch between two fundamentally different behaviors. Prefer separate endpoints or methods instead.
- All new interfaces should have at least one corresponding unit test that validates the happy path and one primary error case.
