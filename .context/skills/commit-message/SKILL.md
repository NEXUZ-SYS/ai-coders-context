---
type: skill
name: Commit Message
description: Generate commit messages following conventional commits with scope detection
skillSlug: commit-message
phases: [E, C]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Invoke this skill during the **Execute** and **Complete** phases of the PREVC workflow when changes are ready to be committed. Use it when:

- You have staged changes and need a well-structured commit message.
- Multiple files across different modules are modified and the scope needs to be identified.
- You want to ensure the commit message follows the Conventional Commits specification used by this project.
- A release is being prepared and commit history must be clean and parseable for CHANGELOG generation.

## Instructions

1. **Analyze the diff.** Review all staged changes (`git diff --cached`) to understand the full scope of modifications.
2. **Determine the commit type.** Select from:
   - `feat` -- new functionality or capability.
   - `fix` -- bug fix.
   - `refactor` -- code restructuring without behavior change.
   - `test` -- adding or updating tests only.
   - `docs` -- documentation-only changes.
   - `chore` -- tooling, build, or dependency updates.
   - `perf` -- performance improvement.
3. **Detect the scope.** Derive the scope from the primary directory or module affected:
   - Changes in `src/services/fill/` -> scope is `fill`.
   - Changes in `src/generators/skills/` -> scope is `skills`.
   - Changes in `src/workflow/` -> scope is `workflow`.
   - Changes in `src/utils/` -> scope is `utils`.
   - Changes spanning multiple modules -> use the most significant module or omit scope.
   - Changes to `.context/` scaffolding -> scope is `context`.
4. **Write the subject line.** Use imperative mood, lowercase, no trailing period. Maximum 72 characters.
5. **Write the body (if needed).** Explain *why* the change was made, not *what* changed. Reference related issues or PRs.
6. **Add footer (if needed).** Include `BREAKING CHANGE:` for breaking changes. Reference issues with `Closes #<number>`.

## Examples

Single-scope feature addition:

```
feat(generators): add YAML template support for skill scaffolding

Introduce a YAML output option in the skill generator to support
teams that prefer YAML over Markdown frontmatter.

Closes #42
```

Bug fix with detected scope:

```
fix(fill): prevent duplicate frontmatter parsing on re-fill

parseFrontMatter was called twice when a document already had filled
content, causing the status field to be overwritten. Guard against
re-parsing when isScaffoldContent returns true.
```

Refactoring across multiple modules (scope omitted):

```
refactor: consolidate Dependencies interfaces into shared types

Move repeated dependency interface patterns from individual services
into src/services/shared/types.ts, extending BaseDependencies and
AIDependencies as appropriate.
```

Chore with build scope:

```
chore(build): update Tree-sitter parser binaries for Node 20

Pin tree-sitter and tree-sitter-typescript to versions compatible
with Node.js 20 ABI.
```

## Guidelines

- Always use the Conventional Commits format: `<type>(<scope>): <subject>`.
- Keep the subject line under 72 characters. If the scope makes it too long, abbreviate the scope or omit it.
- Use imperative mood in the subject: "add", "fix", "update", not "added", "fixes", "updated".
- The body should explain motivation and context, not repeat the diff. Assume the reader can see the code.
- One commit should represent one logical change. If staged changes span unrelated concerns, recommend splitting into multiple commits.
- When changes touch test files only (e.g., `*.test.ts`), use `test` as the type, not `feat` or `fix`.
- For changes to `.context/` documentation scaffolding, use `docs(context)` as the type and scope.
- When preparing a release commit, the message should be `chore(release): vX.Y.Z` and the body should reference the CHANGELOG update.
