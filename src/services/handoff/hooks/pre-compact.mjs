#!/usr/bin/env node

/**
 * PreCompact Hook - Reactive Safety Net
 *
 * Fires BEFORE Claude Code compacts the context.
 * Saves the full transcript state as a snapshot for recovery.
 * This is the last line of defense - if the proactive handoff
 * didn't trigger, this ensures context is preserved.
 */

import { loadConfig } from './utils/config-loader.mjs';
import { logger, setDebug } from './utils/logger.mjs';
import { readStdin } from './utils/hook-io.mjs';
import { readTranscript } from './lib/transcript-reader.mjs';
import { assessContextHealth } from './lib/token-estimator.mjs';
import { summarizeTranscript } from './lib/context-summarizer.mjs';
import { generateHandoffPrompt } from './lib/handoff-generator.mjs';
import {
  getCurrentSession,
  saveHandoffPending,
  archiveSession,
} from './lib/state-manager.mjs';

const COMPONENT = 'pre-compact';

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

    logger.info(COMPONENT, 'PreCompact triggered - saving context before compaction');

    if (!transcriptPath) {
      logger.error(COMPONENT, 'No transcript_path available');
      process.exit(0);
    }

    // Read full transcript
    const entries = readTranscript(transcriptPath);
    if (entries.length === 0) {
      logger.warn(COMPONENT, 'Empty transcript, nothing to save');
      process.exit(0);
    }

    // Assess current health
    const health = assessContextHealth(entries);

    // Generate snapshot
    const snapshot = summarizeTranscript(entries);

    // Generate handoff prompt
    const metadata = {
      fromSessionId: sessionId,
      trigger: 'pre-compact',
      usagePercent: health.usagePercent,
    };

    const handoffPrompt = generateHandoffPrompt(snapshot, metadata);

    // Save handoff pending
    saveHandoffPending({
      fromSessionId: sessionId,
      trigger: 'pre-compact',
      usagePercent: health.usagePercent,
      snapshot,
      handoffPrompt,
    });

    // Archive the session
    const session = getCurrentSession();
    archiveSession(sessionId || 'unknown', {
      ...session,
      snapshot,
      health,
      archivedAt: new Date().toISOString(),
      archiveReason: 'pre-compact',
    });

    logger.info(COMPONENT, `Context saved before compaction (${health.usagePercent}% usage, ${entries.length} entries)`);
  } catch (err) {
    logger.error(COMPONENT, `PreCompact failed: ${err.message}`);
  }

  process.exit(0);
}

main();
