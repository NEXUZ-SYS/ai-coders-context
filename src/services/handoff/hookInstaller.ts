/**
 * Hook Installer
 *
 * Installs/uninstalls auto-handoff hooks in a project's Claude Code settings.
 * Copies standalone hook scripts from the npm package to .claude/extensions/auto-handoff/.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { InstallResult, HandoffConfig } from './types';
import { DEFAULT_CONFIG } from './handoffService';

const HOOK_DEFINITIONS = {
  PostToolUse: [{
    hooks: [{
      type: 'command',
      command: 'node .claude/extensions/auto-handoff/src/monitor.mjs',
      timeout: 5,
    }],
  }],
  PreCompact: [{
    hooks: [{
      type: 'command',
      command: 'node .claude/extensions/auto-handoff/src/pre-compact.mjs',
      timeout: 30,
    }],
  }],
  SessionStart: [{
    matcher: 'startup|compact|resume',
    hooks: [{
      type: 'command',
      command: 'node .claude/extensions/auto-handoff/src/session-start.mjs',
      timeout: 10,
    }],
  }],
  Stop: [{
    hooks: [{
      type: 'command',
      command: 'node .claude/extensions/auto-handoff/src/on-stop.mjs',
      timeout: 15,
    }],
  }],
};

/**
 * Install auto-handoff hooks.
 */
export function installHooks(
  repoPath: string,
  target: 'project' | 'user' = 'project'
): InstallResult {
  const settingsPath = target === 'project'
    ? path.join(repoPath, '.claude', 'settings.json')
    : path.join(process.env.HOME || '~', '.claude', 'settings.json');

  // 1. Copy hook scripts
  const hooksDirPath = copyHookScripts(repoPath);

  // 2. Write default config
  const configPath = path.join(repoPath, '.claude', 'extensions', 'auto-handoff', 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }

  // 3. Copy wrapper script
  copyWrapperScript(repoPath);

  // 4. Ensure state directories
  const stateDir = path.join(repoPath, '.claude', 'extensions', 'auto-handoff', 'state');
  fs.mkdirSync(path.join(stateDir, 'sessions'), { recursive: true });

  // 5. Merge hooks into settings
  mergeHooksIntoSettings(settingsPath);

  return { success: true, target, hooksDirPath, settingsPath, configPath };
}

/**
 * Uninstall auto-handoff hooks.
 */
export function uninstallHooks(
  repoPath: string,
  target: 'project' | 'user' = 'project'
): void {
  const settingsPath = target === 'project'
    ? path.join(repoPath, '.claude', 'settings.json')
    : path.join(process.env.HOME || '~', '.claude', 'settings.json');

  if (!fs.existsSync(settingsPath)) return;

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  if (!settings.hooks) return;

  // Remove auto-handoff hooks
  for (const [event, handlers] of Object.entries(settings.hooks)) {
    if (!Array.isArray(handlers)) continue;
    settings.hooks[event] = (handlers as Array<{ hooks?: Array<{ command?: string }> }>).filter(
      (h) => !h.hooks?.some((hook) => typeof hook.command === 'string' && hook.command.includes('auto-handoff'))
    );
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Check if hooks are installed.
 */
export function isInstalled(repoPath: string): boolean {
  const extensionDir = path.join(repoPath, '.claude', 'extensions', 'auto-handoff');
  const settingsPath = path.join(repoPath, '.claude', 'settings.json');

  if (!fs.existsSync(extensionDir)) return false;
  if (!fs.existsSync(settingsPath)) return false;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return !!(settings.hooks?.PreCompact || settings.hooks?.SessionStart);
  } catch {
    return false;
  }
}

// --- Internal ---

function copyHookScripts(repoPath: string): string {
  const targetDir = path.join(repoPath, '.claude', 'extensions', 'auto-handoff', 'src');
  const targetLibDir = path.join(targetDir, 'lib');
  const targetUtilsDir = path.join(targetLibDir, 'utils');
  fs.mkdirSync(targetUtilsDir, { recursive: true });

  // Resolve source: hooks are distributed alongside the compiled package
  const sourceDir = resolveHooksSource();

  if (sourceDir) {
    copyDir(sourceDir, targetDir);
  } else {
    // Fallback: generate hooks from templates
    generateHookScripts(targetDir);
  }

  return targetDir;
}

function resolveHooksSource(): string | null {
  // Try to find hooks in the npm package directory
  // They are at: <package-root>/src/services/handoff/hooks/
  const candidates = [
    path.join(__dirname, 'hooks'),                          // compiled: dist/services/handoff/hooks
    path.join(__dirname, '..', '..', '..', 'src', 'services', 'handoff', 'hooks'), // dev: from dist back to src
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'monitor.mjs'))) {
      return candidate;
    }
  }

  return null;
}

function copyDir(source: string, target: string): void {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyWrapperScript(repoPath: string): void {
  const targetPath = path.join(repoPath, '.claude', 'extensions', 'auto-handoff', 'auto-handoff.sh');

  const templateSource = resolveTemplatePath('auto-handoff.sh');
  if (templateSource) {
    fs.copyFileSync(templateSource, targetPath);
  }

  // Make executable
  try {
    fs.chmodSync(targetPath, 0o755);
  } catch {
    // ignore on Windows
  }
}

function resolveTemplatePath(fileName: string): string | null {
  const candidates = [
    path.join(__dirname, 'templates', fileName),
    path.join(__dirname, '..', '..', '..', 'src', 'services', 'handoff', 'templates', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function mergeHooksIntoSettings(settingsPath: string): void {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  const existingHooks = (settings.hooks || {}) as Record<string, unknown>;
  settings.hooks = { ...existingHooks, ...HOOK_DEFINITIONS };

  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

function generateHookScripts(_targetDir: string): void {
  // Fallback: when hook source files aren't found in the package,
  // this would generate them from templates.
  // For now, the hooks are always distributed with the package.
}
