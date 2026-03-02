---
type: skill
name: Feature Breakdown
description: Break down features into implementable tasks
skillSlug: feature-breakdown
phases: [P]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Invoke this skill during the **Plan** phase of the PREVC workflow when a new feature request, enhancement, or significant change needs to be decomposed into discrete, implementable tasks. Use it when:

- A feature touches multiple layers of the codebase (CLI, services, generators, workflow).
- The scope of work is ambiguous and needs structured decomposition before execution.
- You need to identify which `src/services/`, `src/generators/`, or `src/workflow/` modules will be affected.
- A plan document needs to be created or updated under `.context/plans/`.

Do not use this skill for trivial one-file changes or bug fixes that have an obvious single-step resolution.

## Instructions

1. **Gather context.** Read the feature request or issue description in full. Cross-reference with `project-overview.md` and `codebase-map.json` to understand which architectural layers are involved.
2. **Identify affected modules.** Map the feature to concrete directories and files. Use the project's layered structure:
   - `src/services/` for business logic and orchestration.
   - `src/generators/` for template and scaffold generation.
   - `src/workflow/` for PREVC phase management.
   - `src/utils/` for shared helpers.
3. **Decompose into tasks.** Break the feature into ordered, atomic tasks. Each task should:
   - Target a single module or concern.
   - Be independently testable.
   - Specify the `*Dependencies` interface changes needed, if any.
4. **Define dependencies between tasks.** Identify which tasks block others and note the execution order.
5. **Estimate scope.** Classify each task as small (single file), medium (single service), or large (cross-service).
6. **Output a structured plan.** Format the breakdown as a numbered task list with file paths, descriptions, and acceptance criteria.

## Examples

Breaking down a "support YAML export format" feature:

```markdown
### Feature: YAML Export Format

#### Tasks

1. **Add YAML serializer utility**
   - File: `src/utils/yamlSerializer.ts`
   - Create a utility that converts JSON context output to YAML.
   - Test: `src/utils/yamlSerializer.test.ts`

2. **Extend ContextExportService**
   - File: `src/services/export/contextExportService.ts`
   - Add `format` option to the `ExportServiceDependencies` interface.
   - Wire the YAML serializer as an alternative output path.
   - Test: unit test for YAML branch in export logic.

3. **Add CLI flag**
   - File: `src/index.ts`
   - Add `--format yaml` option to the `export` command.
   - Pass the flag through to the export service.

4. **Update documentation scaffolding**
   - File: `.context/docs/tooling.md`
   - Document the new `--format` flag and supported values.
```

Identifying dependency injection points for a new service:

```typescript
// Pattern: define a Dependencies interface for the new service
interface YamlExportDependencies {
  fs: typeof import('fs-extra');
  exportService: ContextExportService;
  cli: CLIInterface;
}
```

## Guidelines

- Always align tasks with the existing directory conventions: services in `src/services/`, generators in `src/generators/`, utilities in `src/utils/`.
- Every task that introduces a new public method or service must include a corresponding test task using the `*.test.ts` colocated convention.
- Follow the dependency injection pattern. If a task introduces a new service, define a `*Dependencies` interface and accept it in the constructor.
- Prefer small, focused tasks over large multi-concern tasks. A good rule: if a task description contains "and" joining two unrelated actions, split it.
- Include acceptance criteria for each task so the Verify phase has clear pass/fail conditions.
- When a feature spans the PREVC workflow itself (e.g., adding a new phase gate), reference `src/workflow/orchestrator.ts` and `src/workflow/phases.ts` explicitly.
- Do not start execution until the full breakdown is reviewed and approved in the Plan phase.
