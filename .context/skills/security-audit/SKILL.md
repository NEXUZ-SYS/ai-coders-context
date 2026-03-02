---
type: skill
name: Security Audit
description: Security review checklist for code and infrastructure
skillSlug: security-audit
phases: [R, V]
generated: 2026-03-02
status: filled
scaffoldVersion: "2.0.0"
---

## When to Use

Activate this skill during the Review (R) and Verify (V) phases of the PREVC workflow when evaluating code for security vulnerabilities. Common triggers include:

- New file system operations are introduced (reading, writing, or deleting files).
- User-supplied input is used to construct file paths, shell commands, or queries.
- New dependencies are added to `package.json`.
- MCP server endpoints or CLI commands accept external input.
- Code interacts with environment variables, credentials, or API keys.
- Changes touch `src/services/mcp/` or any network-facing surface.

## Instructions

1. **Audit input handling.** Trace every path where user or external input enters the system (CLI arguments, MCP tool parameters, configuration files). Verify that inputs are validated and sanitized before use.
2. **Check for path traversal.** Any operation that constructs file paths from user input must normalize the path and verify it stays within the expected project directory. Look for unguarded uses of `path.join()` or `path.resolve()` with untrusted segments.
3. **Review dependency injection points.** Confirm that `*Dependencies` interfaces do not expose overly broad capabilities. A service that only needs to read files should not receive a dependency that can also delete them.
4. **Scan for secrets exposure.** Ensure no API keys, tokens, or credentials are hardcoded in source files. Verify that `.gitignore` excludes `.env` files and any local configuration that may contain secrets.
5. **Evaluate new dependencies.** For any new package in `package.json`, check its maintenance status, known vulnerabilities (via `npm audit`), and whether its permissions scope is appropriate.
6. **Assess command injection risk.** If any code spawns child processes or executes shell commands, verify that arguments are passed as arrays (not interpolated into strings) and that no user input reaches a shell without escaping.
7. **Verify least privilege.** Each service and dependency interface should request only the minimum capabilities needed. Flag any `*Dependencies` interface that grants write access when only read access is required.

## Examples

Flagging a path traversal vulnerability:

```typescript
// VULNERABLE: user input directly joined to base path
async function readDoc(userPath: string): Promise<string> {
  const fullPath = path.join(PROJECT_ROOT, userPath);
  return fs.readFile(fullPath, 'utf-8');
}

// SECURE: normalize and verify the resolved path
async function readDoc(userPath: string): Promise<string> {
  const fullPath = path.resolve(PROJECT_ROOT, userPath);
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    throw new Error('Path traversal detected');
  }
  return fs.readFile(fullPath, 'utf-8');
}
```

Auditing a dependency interface for excessive permissions:

```typescript
// OVERLY BROAD: grants full file system access
export interface AnalyzerDependencies {
  fs: typeof import('fs/promises');
}

// LEAST PRIVILEGE: grants only the specific operations needed
export interface AnalyzerDependencies {
  readFile: (path: string) => Promise<string>;
  stat: (path: string) => Promise<{ isDirectory: boolean }>;
}
```

Checking for command injection:

```typescript
// VULNERABLE: string interpolation in shell command
exec(`git log --oneline ${userBranch}`);

// SECURE: pass arguments as array, no shell interpretation
execFile('git', ['log', '--oneline', userBranch]);
```

## Guidelines

- Treat every MCP tool parameter and CLI argument as untrusted input. Apply validation at the boundary where input enters the system, not deep inside service logic.
- Run `npm audit` as part of every security review. Do not approve PRs that introduce dependencies with known high-severity vulnerabilities without an explicit justification and remediation plan.
- Pay special attention to `src/services/semantic/` code that invokes Tree-sitter parsers on user-supplied files. Malformed input files should not cause crashes or unbounded resource consumption.
- Verify that error messages do not leak internal file paths, stack traces, or system details to external callers. Errors returned through MCP tools should contain user-friendly messages only.
- When reviewing file operations in `src/services/sync/`, `src/services/export/`, or `src/services/init/`, confirm that write operations cannot overwrite files outside the target `.context/` directory.
- Check that any use of `JSON.parse` on external input is wrapped in try/catch to prevent unhandled exceptions from crashing the process.
- Flag any use of `eval()`, `new Function()`, or dynamic `require()` with user-controlled strings as a critical finding that must be resolved before merge.
