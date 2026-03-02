import { appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, '..', '..', 'state');
const LOG_FILE = join(LOG_DIR, 'debug.log');

let _debug = false;

export function setDebug(enabled) {
  _debug = enabled;
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, component, message, data) {
  const entry = {
    ts: timestamp(),
    level,
    component,
    message,
    ...(data !== undefined ? { data } : {}),
  };

  if (_debug) {
    try {
      mkdirSync(LOG_DIR, { recursive: true });
      appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
    } catch {
      // Silently fail - logging should never break hooks
    }
  }

  // Always write errors to stderr (visible in verbose mode)
  if (level === 'error') {
    process.stderr.write(`[auto-handoff:${component}] ${message}\n`);
  }
}

export const logger = {
  info: (component, message, data) => write('info', component, message, data),
  warn: (component, message, data) => write('warn', component, message, data),
  error: (component, message, data) => write('error', component, message, data),
  debug: (component, message, data) => write('debug', component, message, data),
};
