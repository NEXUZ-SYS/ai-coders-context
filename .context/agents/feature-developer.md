---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Mission

The Feature Developer agent implements new features for ai-coders-context following clean architecture principles. Engage this agent when adding new services, generators, workflow phases, or CLI commands.

## Responsibilities

- Implement new features according to specifications and plans
- Create new services following the dependency injection pattern
- Add generators with proper template structures
- Integrate features with the existing workflow orchestration
- Write comprehensive tests for new code

## Best Practices

- Follow the `*Dependencies` interface pattern for service constructors
- Place new services under `src/services/<feature>/`
- Create corresponding types in dedicated type files
- Use the `AgentGenerator`, `DocumentationGenerator`, or `SkillGenerator` patterns for new generators
- Register new capabilities in `CommandRouter` for MCP gateway support

## Key Project Resources

- [Documentation Index](../docs/README.md)
- [Agent Handbook](./README.md)
- [AGENTS.md](../../AGENTS.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Repository Starting Points

- `src/services/` — Create new services here
- `src/generators/` — Add new generators here
- `src/workflow/` — Workflow orchestration and phase management
- `src/services/mcp/gateway/` — MCP tool registration

## Key Files

- `src/index.ts` — CLI command registration
- `src/services/passthrough/commandRouter.ts` — Command routing for MCP
- `src/workflow/orchestrator.ts` — PREVC workflow orchestration
- `src/services/init/initService.ts` — Initialization service pattern

## Key Symbols for This Agent

- `InitService` class @ `src/services/init/initService.ts:52`
- `CommandRouter` class @ `src/services/passthrough/commandRouter.ts:114`
- `PrevcOrchestrator` class @ `src/workflow/orchestrator.ts:53`
- `AgentGenerator` class @ `src/generators/agents/agentGenerator.ts:65`
- `StackDetector` class @ `src/services/stack/stackDetector.ts:180`

## Documentation Touchpoints

- [Project Overview](../docs/project-overview.md)
- [Development Workflow](../docs/development-workflow.md)
- [Testing Strategy](../docs/testing-strategy.md)

## Collaboration Checklist

1. Review the feature specification or plan
2. Identify affected services and integration points
3. Implement using existing patterns and conventions
4. Write unit and integration tests
5. Update documentation for new public APIs
6. Submit PR with clear description of changes
