#!/usr/bin/env node

/**
 * Generate Prompt - CLI utility for the wrapper script.
 *
 * Reads handoff-pending.json and outputs the handoff prompt to stdout.
 * Used by auto-handoff.sh to pipe context into a new Claude session.
 *
 * Usage: node generate-prompt.mjs [--initial <file>]
 *   --initial <file>  Path to initial prompt file (used when no handoff pending)
 */

import { readFileSync } from 'node:fs';
import { getHandoffPending, clearHandoffPending, archiveSession } from './lib/state-manager.mjs';

function main() {
  const args = process.argv.slice(2);
  const initialIndex = args.indexOf('--initial');
  const initialFile = initialIndex >= 0 ? args[initialIndex + 1] : null;

  const handoff = getHandoffPending();

  if (handoff && handoff.handoffPrompt) {
    // Output handoff context + original task continuation
    const parts = [handoff.handoffPrompt];

    parts.push('\n---\n');
    parts.push('Continue o trabalho descrito acima. O contexto foi restaurado automaticamente.');

    process.stdout.write(parts.join('\n'));

    // Archive and clear the handoff
    archiveSession(`wrapper-${handoff.fromSessionId || 'unknown'}`, {
      ...handoff,
      restoredAt: new Date().toISOString(),
      restoreSource: 'wrapper-script',
    });
    clearHandoffPending();
  } else if (initialFile) {
    // No handoff pending, use initial prompt
    try {
      const content = readFileSync(initialFile, 'utf-8');
      process.stdout.write(content);
    } catch (err) {
      process.stderr.write(`Error reading initial prompt: ${err.message}\n`);
      process.exit(1);
    }
  } else {
    process.stderr.write('No handoff pending and no initial prompt provided.\n');
    process.exit(1);
  }
}

main();
