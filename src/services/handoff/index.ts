/**
 * Handoff Module
 *
 * Auto-handoff context preservation system for Claude Code.
 * Prevents context loss from compaction by saving and restoring state.
 */

export { HandoffService, DEFAULT_CONFIG } from './handoffService';
export { StateManager } from './stateManager';
export { installHooks, uninstallHooks, isInstalled } from './hookInstaller';
export { readTranscript, extractMessages, extractContent, extractFilePaths } from './transcriptReader';
export { assessContextHealth, estimateTokensFromChars, calculateUsagePercent } from './tokenEstimator';
export { summarizeTranscript } from './contextSummarizer';
export { generateHandoffPrompt, generateMinimalHandoff } from './handoffGenerator';

export type {
  HandoffConfig,
  HandoffStatus,
  ContextHealth,
  ContextStatus,
  SessionState,
  HandoffPending,
  ContextSnapshot,
  HandoffTrigger,
  InstallResult,
  CleanResult,
  TranscriptEntry,
  TrackedFiles,
} from './types';
