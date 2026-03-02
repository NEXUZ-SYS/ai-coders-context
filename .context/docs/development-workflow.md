---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Development Workflow

This repository follows a feature-branch workflow. Contributors create branches from `main`, develop features or fixes, and submit pull requests for review. The project uses the PREVC (Plan, Review, Execute, Verify, Complete) workflow for structured development, managed by the `PrevcOrchestrator`.

## Branching & Releases

- **Main branch**: `main` — always deployable
- **Feature branches**: `feature/<name>` or `fix/<name>`
- **Release branches**: `release/<version>` for preparing releases
- **Versioning**: Semantic versioning (see CHANGELOG.md)
- **Tags**: `v<major>.<minor>.<patch>` for releases

## Local Development

- Install dependencies: `npm install`
- Run in dev mode: `npm run dev`
- Build: `npm run build`
- Run tests: `npm test`

## Code Review Expectations

All pull requests require at least one approval before merging. Reviewers should check:

- Code follows existing TypeScript patterns and conventions
- New services follow the dependency injection pattern (`*Dependencies` interfaces)
- Tests cover new functionality
- Documentation is updated when public API changes
- No regressions in existing functionality

See [AGENTS.md](../../AGENTS.md) for agent collaboration guidelines and [Testing Strategy](./testing-strategy.md) for test requirements.

## Onboarding Tasks

1. Read the [Project Overview](./project-overview.md) to understand the architecture
2. Review the [Tooling](./tooling.md) guide for development setup
3. Explore `src/services/` to understand the service layer pattern
4. Run `npm test` to verify the local environment works
5. Pick a "good first issue" from the issue tracker
