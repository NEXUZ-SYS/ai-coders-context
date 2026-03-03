#!/usr/bin/env node

/**
 * Stop Hook - Silent Handoff Checkpoint
 *
 * Fires when Claude is about to stop responding.
 * Checks context usage - if above proactive threshold, silently saves
 * a handoff checkpoint and allows the stop to proceed naturally.
 *
 * The saved handoff is restored automatically via two paths:
 * 1. AUTOMATIC: When Claude Code compacts the context (PreCompact saves
 *    latest snapshot → compact happens → SessionStart restores)
 * 2. MANUAL: When user types /clear (SessionStart restores from checkpoint)
 *
 * This approach avoids blocking Claude (which wastes context with verbose
 * messages) and instead lets the natural compact cycle handle continuity.
 */

import { loadConfig } from './utils/config-loader.mjs';
import { logger, setDebug } from './utils/logger.mjs';
import { readStdin } from './utils/hook-io.mjs';
import { readTranscript } from './lib/transcript-reader.mjs';
import { assessContextHealth, isProactiveThresholdReached } from './lib/token-estimator.mjs';
import { summarizeTranscript } from './lib/context-summarizer.mjs';
import { generateHandoffPrompt } from './lib/handoff-generator.mjs';
import {
  getCurrentSession,
  saveCurrentSession,
  saveHandoffPending,
  archiveSession,
} from './lib/state-manager.mjs';

const COMPONENT = 'on-stop';

async function main() {
  const config = loadConfig();
  setDebug(config.debug);

  if (!config.enabled) {
    process.exit(0);
  }

  try {
    const input = await readStdin();
    const sessionId = input.session_id;
    const transcriptPath = input.transcript_path;

    if (!transcriptPath) {
      process.exit(0);
    }

    // Quick check: read current session state first (faster than reading transcript)
    const session = getCurrentSession();
    if (session && session.handoffTriggered) {
      // Already saved checkpoint in this session, no need to re-save
      logger.debug(COMPONENT, 'Handoff checkpoint already saved, allowing stop');
      process.exit(0);
    }

    // Read transcript and assess health
    const entries = readTranscript(transcriptPath);
    const health = assessContextHealth(entries);

    logger.debug(COMPONENT, `Stop check: ${health.usagePercent}% context used (threshold: ${config.proactiveThreshold}%)`);

    // If below threshold, allow normal stop without saving
    if (!isProactiveThresholdReached(health.estimatedTokens)) {
      process.exit(0);
    }

    // Threshold reached! Silently save handoff checkpoint
    logger.info(COMPONENT, `Proactive threshold reached at ${health.usagePercent}% - saving checkpoint`);

    const snapshot = summarizeTranscript(entries);
    const metadata = {
      fromSessionId: sessionId,
      trigger: 'stop-handler',
      usagePercent: health.usagePercent,
    };

    const handoffPrompt = generateHandoffPrompt(snapshot, metadata);

    // Save handoff pending - will be consumed by:
    // - SessionStart after compact (automatic continuity)
    // - SessionStart after /clear (manual continuity)
    // - SessionStart on next session (if user leaves and returns)
    saveHandoffPending({
      fromSessionId: sessionId,
      trigger: 'proactive-threshold',
      usagePercent: health.usagePercent,
      snapshot,
      handoffPrompt,
    });

    // Mark session as checkpoint saved (prevent re-trigger on next stop)
    if (session) {
      session.handoffTriggered = true;
      session.checkpointSavedAt = new Date().toISOString();
      saveCurrentSession(session);
    }

    // Archive the session
    archiveSession(sessionId || 'unknown', {
      ...session,
      snapshot,
      health,
      archivedAt: new Date().toISOString(),
      archiveReason: 'proactive-checkpoint',
    });

    // Notify via stderr (visible in terminal, doesn't consume context)
    process.stderr.write(
      `\n[auto-handoff] Checkpoint salvo (${health.usagePercent}% contexto). ` +
      `Restauração automática via compact ou /clear.\n`
    );

    // Allow the stop - don't block, don't waste context
    // The compact cycle or /clear will handle restoration
    process.exit(0);
  } catch (err) {
    logger.error(COMPONENT, `Stop handler failed: ${err.message}`);
    process.exit(0);
  }
}

main();
