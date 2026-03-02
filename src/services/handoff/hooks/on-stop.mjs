#!/usr/bin/env node

/**
 * Stop Hook - Proactive Handoff Trigger
 *
 * Fires when Claude is about to stop responding.
 * Checks context usage - if above proactive threshold, blocks the stop
 * and instructs Claude to perform a handoff first.
 *
 * This is the proactive layer: it triggers BEFORE compaction would happen,
 * giving Claude a chance to save state and instruct the user to start
 * a new session.
 */

import { loadConfig } from './utils/config-loader.mjs';
import { logger, setDebug } from './utils/logger.mjs';
import { readStdin, writeResponse } from './utils/hook-io.mjs';
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

    // Prevent infinite loops: if stop_hook_active, don't block again
    if (input.stop_hook_active) {
      logger.debug(COMPONENT, 'Stop hook already active, allowing stop');
      process.exit(0);
    }

    if (!transcriptPath) {
      process.exit(0);
    }

    // Quick check: read current session state first (faster than reading transcript)
    const session = getCurrentSession();
    if (session && session.handoffTriggered) {
      // Already triggered handoff in this session, allow stop
      logger.debug(COMPONENT, 'Handoff already triggered, allowing stop');
      process.exit(0);
    }

    // Read transcript and assess health
    const entries = readTranscript(transcriptPath);
    const health = assessContextHealth(entries);

    logger.debug(COMPONENT, `Stop check: ${health.usagePercent}% context used (threshold: ${config.proactiveThreshold}%)`);

    // If below threshold, allow normal stop
    if (!isProactiveThresholdReached(health.estimatedTokens)) {
      process.exit(0);
    }

    // Threshold reached! Generate handoff and save state
    logger.info(COMPONENT, `Proactive threshold reached at ${health.usagePercent}% - triggering handoff`);

    const snapshot = summarizeTranscript(entries);
    const metadata = {
      fromSessionId: sessionId,
      trigger: 'stop-handler',
      usagePercent: health.usagePercent,
    };

    const handoffPrompt = generateHandoffPrompt(snapshot, metadata);

    // Save handoff pending for the next session
    saveHandoffPending({
      fromSessionId: sessionId,
      trigger: 'proactive-threshold',
      usagePercent: health.usagePercent,
      snapshot,
      handoffPrompt,
    });

    // Mark session as handoff triggered (prevent re-trigger)
    if (session) {
      session.handoffTriggered = true;
      saveCurrentSession(session);
    }

    // Archive the session
    archiveSession(sessionId || 'unknown', {
      ...session,
      snapshot,
      health,
      archivedAt: new Date().toISOString(),
      archiveReason: 'proactive-handoff',
    });

    // Block the stop and instruct Claude to notify the user
    writeResponse({
      decision: 'block',
      reason: [
        `⚠️ AUTO-HANDOFF: O contexto atingiu ${health.usagePercent}% da capacidade.`,
        '',
        'O estado da sessão foi salvo automaticamente.',
        'Por favor, informe ao usuário:',
        '',
        '1. O contexto está próximo do limite e será salvo automaticamente',
        '2. É recomendado iniciar uma nova sessão para continuar o trabalho',
        '3. Na nova sessão, o contexto será restaurado automaticamente via auto-handoff',
        '',
        'Se estiver em modo autônomo (wrapper script), a nova sessão será iniciada automaticamente.',
        '',
        'Finalize sua resposta atual e avise o usuário sobre o handoff.',
      ].join('\n'),
    });
  } catch (err) {
    logger.error(COMPONENT, `Stop handler failed: ${err.message}`);
    process.exit(0);
  }
}

main();
