#!/usr/bin/env node

/**
 * SessionStart Hook - Seamless Context Restorer
 *
 * Fires when a new session starts, after compaction, after /clear,
 * or on session resume. If a handoff is pending, reads the saved
 * snapshot and outputs the handoff prompt to stdout (which Claude Code
 * injects into context).
 *
 * This enables seamless multi-session continuity:
 * - After compact: Context was auto-reduced, handoff restores structured details
 * - After /clear: User manually cleared, handoff provides full recovery
 * - On startup: New session detects pending handoff from previous session
 * - On resume: Session resumed with handoff context
 *
 * Matcher: startup|compact|resume|clear
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

/**
 * Build a source-aware preamble that tells Claude about the transition type.
 */
function buildPreamble(source, handoff) {
  const lines = [];

  if (source === 'compact') {
    lines.push('> **Transição automática**: O contexto foi compactado pelo Claude Code.');
    lines.push('> O handoff abaixo restaura os detalhes estruturados da sessão anterior.');
    lines.push('> Continue o trabalho sem interrupção.');
  } else if (source === 'clear') {
    lines.push('> **Sessão limpa**: O usuário executou /clear.');
    lines.push('> O handoff abaixo restaura o contexto da sessão anterior.');
    lines.push('> Continue o trabalho de onde parou.');
  } else if (source === 'startup') {
    lines.push('> **Nova sessão**: Existe um handoff pendente da sessão anterior.');
    lines.push('> O contexto abaixo foi preservado automaticamente.');
  }

  if (handoff.usagePercent) {
    lines.push(`> Uso de contexto na sessão anterior: ${handoff.usagePercent}%`);
  }

  lines.push('');
  return lines.join('\n');
}

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

    logger.info(COMPONENT, `Restoring handoff from session ${handoff.fromSessionId} (source: ${source}, trigger: ${handoff.trigger})`);

    // Build source-aware preamble + handoff prompt
    if (handoff.handoffPrompt) {
      const preamble = buildPreamble(source, handoff);
      writeText(preamble + handoff.handoffPrompt);
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

    // Notify user via stderr (visible in terminal)
    process.stderr.write(
      `[auto-handoff] Contexto restaurado (source: ${source}, sessão anterior: ${handoff.fromSessionId || 'unknown'})\n`
    );

    logger.info(COMPONENT, 'Context restored successfully');
  } catch (err) {
    logger.error(COMPONENT, `Session start failed: ${err.message}`);
  }

  process.exit(0);
}

main();
