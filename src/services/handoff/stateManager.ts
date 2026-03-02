/**
 * State Manager
 *
 * Manages handoff session state on disk.
 * State directory is at: {repoPath}/.claude/extensions/auto-handoff/state/
 */

import * as fs from 'fs';
import * as path from 'path';
import type { SessionState, HandoffPending, HandoffConfig } from './types';

export class StateManager {
  private stateDir: string;
  private sessionsDir: string;

  constructor(repoPath: string) {
    this.stateDir = path.join(repoPath, '.claude', 'extensions', 'auto-handoff', 'state');
    this.sessionsDir = path.join(this.stateDir, 'sessions');
  }

  private ensureDirs(): void {
    fs.mkdirSync(this.stateDir, { recursive: true });
    fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  private get currentSessionPath(): string {
    return path.join(this.stateDir, 'current-session.json');
  }

  private get handoffPendingPath(): string {
    return path.join(this.stateDir, 'handoff-pending.json');
  }

  private get workCompleteFlagPath(): string {
    return path.join(this.stateDir, 'work-complete.flag');
  }

  // --- Current Session ---

  getCurrentSession(): SessionState | null {
    try {
      const raw = fs.readFileSync(this.currentSessionPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveCurrentSession(data: SessionState): SessionState {
    this.ensureDirs();
    const session = { ...data, lastUpdatedAt: new Date().toISOString() };
    fs.writeFileSync(this.currentSessionPath, JSON.stringify(session, null, 2));
    return session;
  }

  initSession(sessionId: string, transcriptPath?: string): SessionState {
    return this.saveCurrentSession({
      sessionId,
      transcriptPath,
      startedAt: new Date().toISOString(),
      estimatedTokens: 0,
      usagePercent: 0,
      toolCallCount: 0,
      messageCount: 0,
      thresholdReached: false,
      handoffTriggered: false,
    });
  }

  clearCurrentSession(): void {
    try {
      if (fs.existsSync(this.currentSessionPath)) {
        fs.unlinkSync(this.currentSessionPath);
      }
    } catch {
      // ignore
    }
  }

  // --- Handoff Pending ---

  getHandoffPending(): HandoffPending | null {
    try {
      const raw = fs.readFileSync(this.handoffPendingPath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveHandoffPending(data: HandoffPending): HandoffPending {
    this.ensureDirs();
    const handoff = { ...data, savedAt: new Date().toISOString() };
    fs.writeFileSync(this.handoffPendingPath, JSON.stringify(handoff, null, 2));
    return handoff;
  }

  hasHandoffPending(): boolean {
    return fs.existsSync(this.handoffPendingPath);
  }

  clearHandoffPending(): void {
    try {
      if (fs.existsSync(this.handoffPendingPath)) {
        fs.unlinkSync(this.handoffPendingPath);
      }
    } catch {
      // ignore
    }
  }

  // --- Session History ---

  archiveSession(sessionId: string, data: Record<string, unknown>): string {
    this.ensureDirs();
    const fileName = `${sessionId}-${Date.now()}.json`;
    const filePath = path.join(this.sessionsDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  listSessions(): string[] {
    this.ensureDirs();
    try {
      return fs.readdirSync(this.sessionsDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  getSession(fileName: string): Record<string, unknown> | null {
    try {
      const filePath = path.join(this.sessionsDir, fileName);
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  pruneOldSessions(maxHistory: number): number {
    const sessions = this.listSessions();
    if (sessions.length <= maxHistory) return 0;

    const toRemove = sessions.slice(maxHistory);
    let removed = 0;
    for (const file of toRemove) {
      try {
        fs.unlinkSync(path.join(this.sessionsDir, file));
        removed++;
      } catch {
        // ignore
      }
    }
    return removed;
  }

  // --- Work Complete Flag ---

  setWorkComplete(): void {
    this.ensureDirs();
    fs.writeFileSync(this.workCompleteFlagPath, new Date().toISOString());
  }

  isWorkComplete(): boolean {
    return fs.existsSync(this.workCompleteFlagPath);
  }

  clearWorkComplete(): void {
    try {
      if (fs.existsSync(this.workCompleteFlagPath)) {
        fs.unlinkSync(this.workCompleteFlagPath);
      }
    } catch {
      // ignore
    }
  }

  // --- Clean all ---

  cleanAll(): { sessionsRemoved: number; handoffCleared: boolean; currentSessionCleared: boolean } {
    const sessions = this.listSessions();
    let sessionsRemoved = 0;
    for (const file of sessions) {
      try {
        fs.unlinkSync(path.join(this.sessionsDir, file));
        sessionsRemoved++;
      } catch {
        // ignore
      }
    }

    const handoffCleared = this.hasHandoffPending();
    this.clearHandoffPending();

    const currentSessionCleared = this.getCurrentSession() !== null;
    this.clearCurrentSession();

    this.clearWorkComplete();

    return { sessionsRemoved, handoffCleared, currentSessionCleared };
  }

  // --- Paths ---

  get paths() {
    return {
      stateDir: this.stateDir,
      sessionsDir: this.sessionsDir,
      currentSession: this.currentSessionPath,
      handoffPending: this.handoffPendingPath,
      workCompleteFlag: this.workCompleteFlagPath,
    };
  }
}
