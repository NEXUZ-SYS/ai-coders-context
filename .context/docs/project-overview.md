---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## Project Overview

AI Coders Context (ai-context) is a CLI tool and MCP server that generates structured documentation scaffolding for codebases. It helps AI coding agents understand repository context by creating docs, agent playbooks, skills, and plans through semantic code analysis.

## Codebase Reference

> **Detailed Analysis**: For complete symbol counts, architecture layers, and dependency graphs, see [`codebase-map.json`](./codebase-map.json).

## Quick Facts

- Languages: TypeScript (240 files), JavaScript (2 files)
- Entry: `src/index.ts`
- Package: `ai-coders-context` (npm)
- Node: >= 20.0.0
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- `src/index.ts` — Main CLI entry point (commander-based)
- `src/services/mcp/` — MCP server gateway
- `src/services/passthrough/` — Passthrough/stdin protocol

## Key Exports

See [`codebase-map.json`](./codebase-map.json) for the complete list of 649+ exports.

## File Structure & Code Organization

- `src/` — TypeScript source (240 files)
- `src/services/` — Core service layer (init, fill, sync, export, AI, MCP, etc.)
- `src/generators/` — Template generators for docs, agents, plans, skills
- `src/workflow/` — PREVC workflow orchestration and phase management
- `src/utils/` — Shared utilities (git, frontmatter, CLI UI)
- `prompts/` — Prompt templates for AI-driven content generation
- `scripts/` — Build and utility scripts
- `docs/` — Published documentation

## Technology Stack Summary

Built on Node.js (>=20) with TypeScript. Uses Commander for CLI, Inquirer for interactive prompts, Chalk/Ora for terminal UI. Jest for testing. Tree-sitter for semantic code analysis. Supports AI providers via AI SDK (Vercel). Published to npm with a `bin` entry.

## CLI Interaction Libraries

The CLI uses `inquirer` for interactive prompts, `chalk` for colored output, and `ora` for spinners. The `CLIInterface` class in `src/utils/cliUI.ts` centralizes terminal interaction.

## Getting Started Checklist

1. Clone the repository and run `npm install`.
2. Build the project with `npm run build`.
3. Run the CLI with `npx ai-context` or `npm run dev`.
4. Review [Development Workflow](./development-workflow.md) for day-to-day tasks.
5. Check [Testing Strategy](./testing-strategy.md) for running tests.
