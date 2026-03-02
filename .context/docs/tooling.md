---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Tooling & Productivity Guide

This guide covers the scripts, tools, and automation that keep contributors productive when working on ai-coders-context.

## Required Tooling

- **Node.js** >= 20.0.0 — Runtime for the CLI and all services
- **npm** — Package manager (lockfile committed)
- **TypeScript** — All source code is TypeScript, compiled via `tsc`
- **Git** — Version control; the `GitService` class wraps common operations
- **Tree-sitter** — Semantic code analysis (installed as npm dependency)

## Recommended Automation

- **Build**: `npm run build` compiles TypeScript to `dist/`
- **Dev mode**: `npm run dev` for iterative development
- **Testing**: `npm test` runs the full Jest suite
- **MCP Server**: The project can run as an MCP server for AI tool integration via `src/services/mcp/`

## IDE / Editor Setup

- **VS Code** recommended with the following extensions:
  - TypeScript language support (built-in)
  - ESLint extension for inline linting
  - Jest Runner for running tests from the editor
- **Workspace settings**: Use `tsconfig.json` at the root for TypeScript configuration

## Productivity Tips

- Use `npx ai-context` to scaffold context for any repository
- The `--semantic` flag enables Tree-sitter-based code analysis for richer context
- Use `--autoFill` during init to pre-generate content suggestions
- The MCP gateway (`src/services/mcp/gateway/`) allows integration with AI coding assistants
- Check `scripts/` for utility scripts

See [Development Workflow](./development-workflow.md) for the day-to-day engineering process.
