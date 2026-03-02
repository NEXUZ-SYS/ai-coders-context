import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, '..', '..', 'config.json');

const DEFAULT_CONFIG = {
  enabled: true,
  contextLimit: 200000,
  proactiveThreshold: 80,
  reactiveThreshold: 95,
  tokenEstimation: {
    charsPerToken: 3.5,
    includeToolResults: true,
    includeThinkingBlocks: false,
  },
  snapshot: {
    maxSummaryTokens: 4000,
    includeFileList: true,
    includeDecisions: true,
    includeProgress: true,
    maxFilesTracked: 50,
  },
  wrapper: {
    maxIterations: 20,
    delayBetweenSessions: 2,
    tool: 'claude',
  },
  maxSessionHistory: 10,
  debug: false,
};

let _cached = null;

export function loadConfig() {
  if (_cached) return _cached;

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const user = JSON.parse(raw);
    _cached = deepMerge(DEFAULT_CONFIG, user);
  } catch {
    _cached = { ...DEFAULT_CONFIG };
  }

  return _cached;
}

export function resetConfigCache() {
  _cached = null;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object'
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
