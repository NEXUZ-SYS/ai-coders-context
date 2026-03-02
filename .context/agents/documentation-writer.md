---
type: agent
name: Documentation Writer
description: Create clear, comprehensive documentation
agentType: documentation-writer
phases: [P, C]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

The Documentation Writer agent creates and maintains clear, accurate documentation for the ai-coders-context project. Engage this agent when new features need documentation, existing docs are outdated, or scaffold templates need updating.

## Responsibilities

- Write and update documentation files in `.context/docs/`
- Maintain agent playbooks in `.context/agents/`
- Keep README.md and CONTRIBUTING.md in sync with codebase changes
- Create documentation for new services, generators, and workflows
- Ensure cross-references between docs are valid

## Best Practices

- Follow the scaffold structure templates for consistent formatting
- Use frontmatter correctly (type, name, status fields)
- Keep documentation concise and actionable
- Include code examples for CLI commands and API usage
- Link to `codebase-map.json` instead of listing all symbols inline

## Key Project Resources

- [Documentation Index](../docs/README.md)
- [Agent Handbook](./README.md)
- [AGENTS.md](../../AGENTS.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points

- `.context/docs/` — Documentation files
- `.context/agents/` — Agent playbook files
- `src/generators/documentation/` — Documentation generator code
- `src/generators/shared/structures/` — Structure definitions for scaffolds

## Key Files

- `src/generators/documentation/documentationGenerator.ts` — Doc generation logic
- `src/generators/shared/structures/documentation/` — Doc structure templates
- `src/utils/frontMatter.ts` — Frontmatter parsing and manipulation
- `src/services/fill/fillService.ts` — Fill service for scaffold content

## Key Symbols for This Agent

- `FillService` class @ `src/services/fill/fillService.ts:92`
- `DocumentLinker` class @ `src/workflow/orchestration/documentLinker.ts:150`
- `parseFrontMatter` function @ `src/utils/frontMatter.ts:93`
- `DocScaffoldFrontmatter` interface @ `src/types/scaffoldFrontmatter.ts:42`

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md)
- [Development Workflow](../docs/development-workflow.md)
- [Tooling](../docs/tooling.md)

## Collaboration Checklist

1. Identify which documents need creation or update
2. Review the scaffold structure for the target document type
3. Write content following the tone and audience guidelines
4. Verify cross-references and links are valid
5. Update docs/README.md index if new documents are added
6. Ensure frontmatter status is set to "filled"
