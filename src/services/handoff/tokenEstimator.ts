/**
 * Token Estimator
 *
 * Estimates token usage from transcript entries using character-based heuristics.
 * Claude models use BPE tokenization; empirical ratios:
 * - English text: ~4 chars/token
 * - Code: ~3 chars/token
 * - Mixed (typical session): ~3.5 chars/token
 */

import type {
  HandoffConfig,
  TranscriptEntry,
  ContextHealth,
  ContextStatus,
} from './types';
import { extractContent } from './transcriptReader';

/**
 * Estimate token count from character count.
 */
export function estimateTokensFromChars(charCount: number, charsPerToken: number): number {
  if (charCount === 0) return 0;
  return Math.ceil(charCount / charsPerToken);
}

/**
 * Estimate tokens from raw file size (quick heuristic).
 * JSONL overhead is ~20% of the actual content.
 */
export function estimateTokensFromFileSize(fileSizeBytes: number, charsPerToken: number): number {
  const effectiveChars = fileSizeBytes * 0.8;
  return estimateTokensFromChars(effectiveChars, charsPerToken);
}

/**
 * Estimate total tokens from transcript entries.
 */
export function estimateTokensFromEntries(
  entries: TranscriptEntry[],
  config: Pick<HandoffConfig, 'tokenEstimation'>
): number {
  const { charsPerToken, includeToolResults, includeThinkingBlocks } = config.tokenEstimation;
  let totalChars = 0;

  for (const entry of entries) {
    const type = entry.type || entry.role || entry.event;

    if (!includeThinkingBlocks && (type === 'thinking' || entry.is_thinking)) {
      continue;
    }

    if (!includeToolResults && (type === 'tool_result' || type === 'tool_response')) {
      continue;
    }

    totalChars += extractContent(entry).length;
  }

  return estimateTokensFromChars(totalChars, charsPerToken);
}

/**
 * Calculate context usage percentage.
 */
export function calculateUsagePercent(estimatedTokens: number, contextLimit: number): number {
  if (contextLimit <= 0) return 0;
  return Math.min(100, Math.round((estimatedTokens / contextLimit) * 100));
}

/**
 * Determine context status from usage percentage and thresholds.
 */
export function determineStatus(
  usagePercent: number,
  proactiveThreshold: number,
  reactiveThreshold: number
): ContextStatus {
  if (usagePercent < proactiveThreshold * 0.75) return 'healthy';
  if (usagePercent < proactiveThreshold) return 'warning';
  if (usagePercent < reactiveThreshold) return 'critical';
  return 'emergency';
}

/**
 * Full context health assessment.
 */
export function assessContextHealth(
  entries: TranscriptEntry[],
  config: HandoffConfig
): ContextHealth {
  const estimatedTokens = estimateTokensFromEntries(entries, config);
  const usagePercent = calculateUsagePercent(estimatedTokens, config.contextLimit);
  const status = determineStatus(usagePercent, config.proactiveThreshold, config.reactiveThreshold);

  return {
    estimatedTokens,
    contextLimit: config.contextLimit,
    usagePercent,
    status,
    proactiveThreshold: config.proactiveThreshold,
    reactiveThreshold: config.reactiveThreshold,
    remainingTokens: Math.max(0, config.contextLimit - estimatedTokens),
    messageCount: entries.length,
  };
}
