/**
 * Handoff Service
 *
 * Main service for auto-handoff context preservation.
 * Follows the project's Service Layer pattern with dependency injection.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  HandoffConfig,
  HandoffStatus,
  CleanResult,
  InstallResult,
  ContextHealth,
} from './types';
import { StateManager } from './stateManager';
import { readTranscript } from './transcriptReader';
import { assessContextHealth } from './tokenEstimator';
import { summarizeTranscript } from './contextSummarizer';
import { generateHandoffPrompt } from './handoffGenerator';
import { installHooks, uninstallHooks, isInstalled, injectAgentsSnippet, copyHandoffSkill } from './hookInstaller';

export const DEFAULT_CONFIG: HandoffConfig = {
  enabled: true,
  contextLimit: 200000,
  proactiveThreshold: 80,
  reactiveThreshold: 95,
  tokenEstimation: {
    charsPerToken: 3.5,
    includeToolResults: true,
    includeThinkingBlocks: false,
  },
  snapshot: {
    maxSummaryTokens: 4000,
    includeFileList: true,
    includeDecisions: true,
    includeProgress: true,
    maxFilesTracked: 50,
  },
  wrapper: {
    maxIterations: 20,
    delayBetweenSessions: 2,
    tool: 'claude',
  },
  maxSessionHistory: 10,
  debug: false,
};

export class HandoffService {
  private repoPath: string;
  private stateManager: StateManager;

  constructor(repoPath: string) {
    this.repoPath = path.resolve(repoPath);
    this.stateManager = new StateManager(this.repoPath);
  }

  // --- Setup (lightweight: docs + skill only) ---

  async setup(): Promise<{ agentsInjected: boolean; skillCopied: boolean }> {
    injectAgentsSnippet(this.repoPath);
    const skillCopied = copyHandoffSkill(this.repoPath);
    return { agentsInjected: true, skillCopied };
  }

  // --- Install / Uninstall ---

  async install(target: 'project' | 'user' = 'project'): Promise<InstallResult> {
    return installHooks(this.repoPath, target);
  }

  async uninstall(target: 'project' | 'user' = 'project'): Promise<void> {
    uninstallHooks(this.repoPath, target);
  }

  async isInstalled(): Promise<boolean> {
    return isInstalled(this.repoPath);
  }

  // --- Configuration ---

  getConfig(): HandoffConfig {
    const configPath = this.configPath;
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return this.mergeConfig(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  updateConfig(updates: Partial<HandoffConfig>): HandoffConfig {
    const current = this.getConfig();
    const merged = this.mergeConfig({ ...current, ...updates });
    fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2));
    return merged;
  }

  // --- Status ---

  async getStatus(): Promise<HandoffStatus> {
    const installed = await this.isInstalled();
    const config = this.getConfig();
    const session = this.stateManager.getCurrentSession();
    const handoffPending = this.stateManager.hasHandoffPending();
    const sessions = this.stateManager.listSessions();

    let health: ContextHealth | null = null;
    if (session?.transcriptPath) {
      try {
        health = this.getContextHealth(session.transcriptPath);
      } catch {
        // transcript may not exist
      }
    }

    return {
      installed,
      enabled: config.enabled,
      session,
      handoffPending,
      config,
      health,
      sessionsArchived: sessions.length,
    };
  }

  // --- Context Health ---

  getContextHealth(transcriptPath: string): ContextHealth {
    const config = this.getConfig();
    const entries = readTranscript(transcriptPath);
    return assessContextHealth(entries, config);
  }

  // --- Handoff ---

  async triggerHandoff(reason?: string): Promise<void> {
    const session = this.stateManager.getCurrentSession();
    const config = this.getConfig();

    if (!session?.transcriptPath) {
      throw new Error('No active session with transcript path');
    }

    const entries = readTranscript(session.transcriptPath);
    const health = assessContextHealth(entries, config);
    const snapshot = summarizeTranscript(entries, config);

    const metadata = {
      fromSessionId: session.sessionId,
      trigger: 'manual' as const,
      usagePercent: health.usagePercent,
    };

    const handoffPrompt = generateHandoffPrompt(snapshot, metadata);

    this.stateManager.saveHandoffPending({
      fromSessionId: session.sessionId,
      trigger: 'manual',
      usagePercent: health.usagePercent,
      snapshot,
      handoffPrompt,
    });

    // Archive the session
    this.stateManager.archiveSession(session.sessionId, {
      ...session,
      snapshot,
      health,
      archivedAt: new Date().toISOString(),
      archiveReason: reason || 'manual-trigger',
    });

    // Mark session as handoff triggered
    session.handoffTriggered = true;
    this.stateManager.saveCurrentSession(session);
  }

  // --- Clean ---

  async clean(): Promise<CleanResult> {
    return this.stateManager.cleanAll();
  }

  // --- Internal ---

  private get configPath(): string {
    return path.join(this.repoPath, '.claude', 'extensions', 'auto-handoff', 'config.json');
  }

  private mergeConfig(user: Partial<HandoffConfig>): HandoffConfig {
    return {
      ...DEFAULT_CONFIG,
      ...user,
      tokenEstimation: { ...DEFAULT_CONFIG.tokenEstimation, ...user.tokenEstimation },
      snapshot: { ...DEFAULT_CONFIG.snapshot, ...user.snapshot },
      wrapper: { ...DEFAULT_CONFIG.wrapper, ...user.wrapper },
    };
  }
}
