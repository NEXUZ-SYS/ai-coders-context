#!/usr/bin/env node

/**
 * SessionStart Hook - Context Restorer
 *
 * Fires when a new session starts or resumes after compaction.
 * If a handoff is pending, reads the saved snapshot and outputs
 * the handoff prompt to stdout (which Claude Code injects into context).
 *
 * Matcher: startup|compact|resume
 */

import { loadConfig } from './utils/config-loader.mjs';
import { logger, setDebug } from './utils/logger.mjs';
import { readStdin, writeText } from './utils/hook-io.mjs';
import {
  getHandoffPending,
  clearHandoffPending,
  archiveSession,
  initSession,
  hasHandoffPending,
} from './lib/state-manager.mjs';

const COMPONENT = 'session-start';

async function main() {
  const config = loadConfig();
  setDebug(config.debug);

  if (!config.enabled) {
    process.exit(0);
  }

  try {
    const input = await readStdin();
    const sessionId = input.session_id;
    const source = input.source; // "startup", "compact", "resume", "clear"
    const transcriptPath = input.transcript_path;

    logger.info(COMPONENT, `Session start: source=${source}, sessionId=${sessionId}`);

    // Initialize session tracking
    if (sessionId && transcriptPath) {
      initSession(sessionId, transcriptPath);
    }

    // Check for pending handoff
    if (!hasHandoffPending()) {
      logger.debug(COMPONENT, 'No handoff pending');
      process.exit(0);
    }

    const handoff = getHandoffPending();
    if (!handoff) {
      process.exit(0);
    }

    logger.info(COMPONENT, `Restoring handoff from session ${handoff.fromSessionId} (trigger: ${handoff.trigger})`);

    // Output the handoff prompt - Claude Code injects stdout into context
    if (handoff.handoffPrompt) {
      writeText(handoff.handoffPrompt);
    }

    // Archive the handoff data for history
    archiveSession(`handoff-${handoff.fromSessionId || 'unknown'}`, {
      ...handoff,
      restoredAt: new Date().toISOString(),
      restoredInSession: sessionId,
      restoreSource: source,
    });

    // Clear the pending handoff
    clearHandoffPending();

    logger.info(COMPONENT, 'Context restored successfully');
  } catch (err) {
    logger.error(COMPONENT, `Session start failed: ${err.message}`);
  }

  process.exit(0);
}

main();
