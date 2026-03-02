import { logger } from '../utils/logger.mjs';
import { loadConfig } from '../utils/config-loader.mjs';
import { getTotalCharCount, extractContent } from './transcript-reader.mjs';

const COMPONENT = 'token-estimator';

/**
 * Estimate token count from character count using configurable ratio.
 *
 * Claude models use a BPE tokenizer. Empirical ratios:
 * - English text: ~4 chars/token
 * - Code: ~3 chars/token
 * - Mixed (typical session): ~3.5 chars/token
 * - JSON/structured data: ~3 chars/token
 */
export function estimateTokensFromChars(charCount) {
  const config = loadConfig();
  const ratio = config.tokenEstimation.charsPerToken;
  return Math.ceil(charCount / ratio);
}

/**
 * Estimate total tokens from transcript entries.
 * Optionally includes/excludes tool results and thinking blocks.
 */
export function estimateTokensFromEntries(entries) {
  const config = loadConfig();
  let totalChars = 0;

  for (const entry of entries) {
    const type = entry.type || entry.role || entry.event;

    // Skip thinking blocks if configured
    if (!config.tokenEstimation.includeThinkingBlocks) {
      if (type === 'thinking' || entry.is_thinking) continue;
    }

    // Skip tool results if configured
    if (!config.tokenEstimation.includeToolResults) {
      if (type === 'tool_result' || type === 'tool_response') continue;
    }

    totalChars += extractContent(entry).length;
  }

  return estimateTokensFromChars(totalChars);
}

/**
 * Estimate tokens from raw file size (quick heuristic).
 * JSONL overhead is ~20% of the actual content.
 */
export function estimateTokensFromFileSize(fileSizeBytes) {
  const effectiveChars = fileSizeBytes * 0.8; // Discount JSON overhead
  return estimateTokensFromChars(effectiveChars);
}

/**
 * Calculate context usage percentage.
 */
export function calculateUsagePercent(estimatedTokens) {
  const config = loadConfig();
  return Math.min(100, Math.round((estimatedTokens / config.contextLimit) * 100));
}

/**
 * Check if proactive threshold is reached.
 */
export function isProactiveThresholdReached(estimatedTokens) {
  const config = loadConfig();
  const percent = calculateUsagePercent(estimatedTokens);
  const reached = percent >= config.proactiveThreshold;

  if (reached) {
    logger.info(COMPONENT, `Proactive threshold reached: ${percent}% >= ${config.proactiveThreshold}%`);
  }

  return reached;
}

/**
 * Check if reactive threshold is reached.
 */
export function isReactiveThresholdReached(estimatedTokens) {
  const config = loadConfig();
  const percent = calculateUsagePercent(estimatedTokens);
  return percent >= config.reactiveThreshold;
}

/**
 * Full context health assessment.
 */
export function assessContextHealth(entries) {
  const estimatedTokens = estimateTokensFromEntries(entries);
  const config = loadConfig();
  const usagePercent = calculateUsagePercent(estimatedTokens);

  let status;
  if (usagePercent < config.proactiveThreshold * 0.75) {
    status = 'healthy';
  } else if (usagePercent < config.proactiveThreshold) {
    status = 'warning';
  } else if (usagePercent < config.reactiveThreshold) {
    status = 'critical';
  } else {
    status = 'emergency';
  }

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
