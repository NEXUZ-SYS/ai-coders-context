---
type: skill
name: Documentation
description: Generate and update technical documentation
skillSlug: documentation
phases: [P, C]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Invoke this skill during the **Plan** phase to draft documentation for upcoming features, and during the **Complete** phase to finalize and update documentation after implementation. Use it when:

- A new service, generator, or workflow component has been added and needs documented.
- Existing documentation in `.context/docs/` is outdated or has `status: unfilled` scaffolding.
- The public CLI interface has changed (new commands, flags, or options).
- The `codebase-map.json` needs to be regenerated after significant structural changes.
- Agent playbooks or skill definitions need documentation updates to reflect new capabilities.

## Instructions

1. **Identify documentation targets.** Determine which documents need creation or updates:
   - `.context/docs/` for project-level documentation (overview, workflow, tooling, testing).
   - `.context/agents/` for agent playbook definitions.
   - `.context/skills/` for skill reference files.
   - `docs/` for published user-facing documentation.
2. **Read existing content.** Always read the current file before writing. Preserve the YAML frontmatter structure. Check the `status` field: if `unfilled`, the file needs full content; if `filled`, update only the sections affected by the change.
3. **Follow the project's documentation structure.** Each document under `.context/docs/` uses:
   - YAML frontmatter with `type`, `name`, `description`, `category`, `generated`, `status`, and `scaffoldVersion`.
   - H2 (`##`) section headers for top-level sections.
   - Relative links to sibling documents (e.g., `[Testing Strategy](./testing-strategy.md)`).
4. **Write for AI agents as the primary audience.** Documentation in this project is consumed by AI coding agents. Be precise about file paths, interface names, and patterns. Avoid vague guidance.
5. **Update cross-references.** When adding a new document, ensure it is linked from related documents and from the appropriate README index file.
6. **Validate frontmatter.** After writing, confirm the frontmatter parses correctly and that `status` is set to `filled`.

## Examples

Filling an unfilled documentation scaffold:

```markdown
---
type: doc
name: tooling
description: Development tools, linters, formatters, and CI/CD pipeline
category: tooling
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Tooling Overview

This project uses TypeScript with strict compiler settings. The build
pipeline is managed through npm scripts defined in `package.json`.

## Build & Run

- `npm run build` -- compiles TypeScript to `dist/`.
- `npm run dev` -- runs the CLI in development mode.
- `npx ai-context` -- runs the published CLI.

## Linting & Formatting

ESLint is configured for TypeScript files. Run with `npm run lint`.
```

Updating documentation after adding a new CLI command:

```markdown
## CLI Commands

...existing content...

### `ai-context workflow`

Manage the PREVC workflow for structured development. Subcommands:

- `ai-context workflow init` -- initialize a new workflow plan.
- `ai-context workflow advance` -- advance to the next PREVC phase.
- `ai-context workflow status` -- display current phase and progress.
```

## Guidelines

- Always preserve existing frontmatter fields. Never remove or rename fields from the YAML block.
- Set `status: filled` only when the document has substantive content in all expected sections. Do not mark a partially written document as filled.
- Use absolute file paths when referencing source code (e.g., `src/services/fill/fillService.ts`), and relative paths when linking to sibling documentation files.
- Keep language direct and technical. Avoid filler phrases like "in order to" or "it is important to note that."
- When documenting a service, always mention its `*Dependencies` interface and constructor pattern so agents know how to instantiate or mock it.
- Cross-reference related documents. For example, if documenting a new test utility, link to `testing-strategy.md`.
- When the `codebase-map.json` is referenced, remind agents to regenerate it after structural changes using the CLI's init or sync commands.
- Do not duplicate content across documents. If a topic is covered in `project-overview.md`, link to it rather than restating it.
