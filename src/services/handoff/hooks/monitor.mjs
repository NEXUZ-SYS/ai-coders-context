#!/usr/bin/env node

/**
 * PostToolUse Hook - Context Monitor
 *
 * Runs asynchronously after each tool call.
 * Reads the transcript, estimates token usage, updates session state.
 * If proactive threshold is reached, writes handoff-pending.
 */

import { loadConfig } from './utils/config-loader.mjs';
import { logger, setDebug } from './utils/logger.mjs';
import { readStdin } from './utils/hook-io.mjs';
import { readTranscript } from './lib/transcript-reader.mjs';
import { assessContextHealth } from './lib/token-estimator.mjs';
import {
  getCurrentSession,
  saveCurrentSession,
  initSession,
} from './lib/state-manager.mjs';

const COMPONENT = 'monitor';

async function main() {
  const config = loadConfig();
  setDebug(config.debug);

  if (!config.enabled) {
    process.exit(0);
  }

  try {
    const input = await readStdin();
    const transcriptPath = input.transcript_path;
    const sessionId = input.session_id;

    if (!transcriptPath) {
      logger.warn(COMPONENT, 'No transcript_path in hook input');
      process.exit(0);
    }

    // Initialize session if first call
    let session = getCurrentSession();
    if (!session || session.sessionId !== sessionId) {
      session = initSession(sessionId, transcriptPath);
    }

    // Read transcript and assess health
    const entries = readTranscript(transcriptPath);
    const health = assessContextHealth(entries);

    // Update session state
    session.estimatedTokens = health.estimatedTokens;
    session.usagePercent = health.usagePercent;
    session.toolCallCount = (session.toolCallCount || 0) + 1;
    session.messageCount = health.messageCount;
    session.contextStatus = health.status;
    session.thresholdReached = health.status === 'critical' || health.status === 'emergency';

    saveCurrentSession(session);

    logger.debug(COMPONENT, `Context health: ${health.status} (${health.usagePercent}%)`, {
      tokens: health.estimatedTokens,
      remaining: health.remainingTokens,
    });
  } catch (err) {
    logger.error(COMPONENT, `Monitor failed: ${err.message}`);
  }

  process.exit(0);
}

main();
