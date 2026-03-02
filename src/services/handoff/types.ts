/**
 * Auto-Handoff Types
 *
 * Type definitions for the handoff context preservation system.
 */

// --- Configuration ---

export interface HandoffConfig {
  enabled: boolean;
  contextLimit: number;
  proactiveThreshold: number;
  reactiveThreshold: number;
  tokenEstimation: TokenEstimationConfig;
  snapshot: SnapshotConfig;
  wrapper: WrapperConfig;
  maxSessionHistory: number;
  debug: boolean;
}

export interface TokenEstimationConfig {
  charsPerToken: number;
  includeToolResults: boolean;
  includeThinkingBlocks: boolean;
}

export interface SnapshotConfig {
  maxSummaryTokens: number;
  includeFileList: boolean;
  includeDecisions: boolean;
  includeProgress: boolean;
  maxFilesTracked: number;
}

export interface WrapperConfig {
  maxIterations: number;
  delayBetweenSessions: number;
  tool: string;
}

// --- Context Health ---

export type ContextStatus = 'healthy' | 'warning' | 'critical' | 'emergency';

export interface ContextHealth {
  estimatedTokens: number;
  contextLimit: number;
  usagePercent: number;
  status: ContextStatus;
  proactiveThreshold: number;
  reactiveThreshold: number;
  remainingTokens: number;
  messageCount: number;
}

// --- Session State ---

export interface SessionState {
  sessionId: string;
  transcriptPath?: string;
  startedAt: string;
  lastUpdatedAt?: string;
  estimatedTokens: number;
  usagePercent: number;
  toolCallCount: number;
  messageCount: number;
  contextStatus?: ContextStatus;
  thresholdReached: boolean;
  handoffTriggered: boolean;
}

// --- Handoff ---

export type HandoffTrigger = 'proactive-threshold' | 'pre-compact' | 'stop-handler' | 'manual' | 'wrapper';

export interface ContextSnapshot {
  currentTask: string;
  filesModified: string[];
  filesRead: string[];
  filesCreated: string[];
  progress: ProgressItem[];
  decisions: string[];
  errors: ErrorItem[];
  keyContext: string;
  stats: SessionStats;
}

export interface ProgressItem {
  status: 'done' | 'pending';
  text: string;
}

export interface ErrorItem {
  content: string;
  resolved: boolean;
}

export interface SessionStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
}

export interface HandoffPending {
  fromSessionId: string;
  savedAt?: string;
  trigger: HandoffTrigger;
  usagePercent: number;
  snapshot: ContextSnapshot;
  handoffPrompt: string;
}

// --- Transcript ---

export interface TranscriptEntry {
  type?: string;
  role?: string;
  event?: string;
  message?: string | { content?: string | ContentBlock[] };
  content?: string | ContentBlock[];
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  name?: string;
  tool?: string;
  input?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  is_thinking?: boolean;
  [key: string]: unknown;
}

export interface ContentBlock {
  type: string;
  text?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
}

export interface CategorizedMessages {
  user: TranscriptEntry[];
  assistant: TranscriptEntry[];
  toolUse: TranscriptEntry[];
  toolResult: TranscriptEntry[];
  system: TranscriptEntry[];
  other: TranscriptEntry[];
}

export interface TrackedFiles {
  read: string[];
  modified: string[];
  created: string[];
}

// --- Service Results ---

export interface InstallResult {
  success: boolean;
  target: 'project' | 'user';
  hooksDirPath: string;
  settingsPath: string;
  configPath: string;
}

export interface CleanResult {
  sessionsRemoved: number;
  handoffCleared: boolean;
  currentSessionCleared: boolean;
}

export interface HandoffStatus {
  installed: boolean;
  enabled: boolean;
  session: SessionState | null;
  handoffPending: boolean;
  config: HandoffConfig;
  health: ContextHealth | null;
  sessionsArchived: number;
}
