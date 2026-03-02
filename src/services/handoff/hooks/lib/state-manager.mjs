import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../utils/config-loader.mjs';
import { logger } from '../utils/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = join(__dirname, '..', '..', 'state');
const SESSIONS_DIR = join(STATE_DIR, 'sessions');
const CURRENT_SESSION_FILE = join(STATE_DIR, 'current-session.json');
const HANDOFF_PENDING_FILE = join(STATE_DIR, 'handoff-pending.json');
const WORK_COMPLETE_FLAG = join(STATE_DIR, 'work-complete.flag');

const COMPONENT = 'state-manager';

function ensureDirs() {
  mkdirSync(STATE_DIR, { recursive: true });
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

// --- Current Session State ---

export function getCurrentSession() {
  try {
    const raw = readFileSync(CURRENT_SESSION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCurrentSession(sessionData) {
  ensureDirs();
  const data = {
    ...sessionData,
    lastUpdatedAt: new Date().toISOString(),
  };
  writeFileSync(CURRENT_SESSION_FILE, JSON.stringify(data, null, 2));
  logger.debug(COMPONENT, 'Session state saved', { usagePercent: data.usagePercent });
  return data;
}

export function initSession(sessionId, transcriptPath) {
  return saveCurrentSession({
    sessionId,
    transcriptPath,
    startedAt: new Date().toISOString(),
    estimatedTokens: 0,
    usagePercent: 0,
    toolCallCount: 0,
    messageCount: 0,
    thresholdReached: false,
    handoffTriggered: false,
  });
}

// --- Handoff Pending ---

export function getHandoffPending() {
  try {
    const raw = readFileSync(HANDOFF_PENDING_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveHandoffPending(handoffData) {
  ensureDirs();
  const data = {
    ...handoffData,
    savedAt: new Date().toISOString(),
  };
  writeFileSync(HANDOFF_PENDING_FILE, JSON.stringify(data, null, 2));
  logger.info(COMPONENT, 'Handoff pending saved', { trigger: data.trigger });
  return data;
}

export function clearHandoffPending() {
  try {
    if (existsSync(HANDOFF_PENDING_FILE)) {
      unlinkSync(HANDOFF_PENDING_FILE);
      logger.debug(COMPONENT, 'Handoff pending cleared');
    }
  } catch (err) {
    logger.error(COMPONENT, `Failed to clear handoff pending: ${err.message}`);
  }
}

// --- Session History ---

export function archiveSession(sessionId, sessionData) {
  ensureDirs();
  const fileName = `${sessionId}-${Date.now()}.json`;
  const filePath = join(SESSIONS_DIR, fileName);
  writeFileSync(filePath, JSON.stringify(sessionData, null, 2));
  logger.info(COMPONENT, `Session archived: ${fileName}`);
  pruneOldSessions();
  return filePath;
}

export function listSessions() {
  ensureDirs();
  try {
    return readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function getSession(fileName) {
  try {
    const filePath = join(SESSIONS_DIR, fileName);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pruneOldSessions() {
  const config = loadConfig();
  const sessions = listSessions();
  if (sessions.length <= config.maxSessionHistory) return;

  const toRemove = sessions.slice(config.maxSessionHistory);
  for (const file of toRemove) {
    try {
      unlinkSync(join(SESSIONS_DIR, file));
      logger.debug(COMPONENT, `Pruned old session: ${file}`);
    } catch {
      // ignore
    }
  }
}

// --- Work Complete Flag ---

export function setWorkComplete() {
  ensureDirs();
  writeFileSync(WORK_COMPLETE_FLAG, new Date().toISOString());
}

export function isWorkComplete() {
  return existsSync(WORK_COMPLETE_FLAG);
}

export function clearWorkComplete() {
  try {
    if (existsSync(WORK_COMPLETE_FLAG)) {
      unlinkSync(WORK_COMPLETE_FLAG);
    }
  } catch {
    // ignore
  }
}

// --- Convenience ---

export function hasHandoffPending() {
  return existsSync(HANDOFF_PENDING_FILE);
}

export const paths = {
  STATE_DIR,
  SESSIONS_DIR,
  CURRENT_SESSION_FILE,
  HANDOFF_PENDING_FILE,
  WORK_COMPLETE_FLAG,
};
