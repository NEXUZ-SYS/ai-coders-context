import { readFileSync, statSync } from 'node:fs';
import { logger } from '../utils/logger.mjs';

const COMPONENT = 'transcript-reader';

/**
 * Reads and parses a Claude Code transcript file (JSONL format).
 * Each line is a JSON object representing a conversation event.
 */
export function readTranscript(transcriptPath) {
  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        logger.warn(COMPONENT, 'Failed to parse transcript line', { line: line.slice(0, 100) });
      }
    }

    logger.debug(COMPONENT, `Read ${entries.length} transcript entries`);
    return entries;
  } catch (err) {
    logger.error(COMPONENT, `Failed to read transcript: ${err.message}`);
    return [];
  }
}

/**
 * Get transcript file size in bytes (quick check without reading).
 */
export function getTranscriptSize(transcriptPath) {
  try {
    const stats = statSync(transcriptPath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Extract messages from transcript entries.
 * Filters and categorizes by role (user, assistant, tool_use, tool_result).
 */
export function extractMessages(entries) {
  const messages = {
    user: [],
    assistant: [],
    toolUse: [],
    toolResult: [],
    system: [],
    other: [],
  };

  for (const entry of entries) {
    // Claude Code transcript format varies; handle common structures
    const type = entry.type || entry.role || entry.event;

    if (type === 'human' || type === 'user') {
      messages.user.push(entry);
    } else if (type === 'assistant') {
      messages.assistant.push(entry);
    } else if (type === 'tool_use' || type === 'tool_call') {
      messages.toolUse.push(entry);
    } else if (type === 'tool_result' || type === 'tool_response') {
      messages.toolResult.push(entry);
    } else if (type === 'system') {
      messages.system.push(entry);
    } else {
      messages.other.push(entry);
    }
  }

  return messages;
}

/**
 * Extract text content from a transcript entry.
 * Handles various content formats (string, array of blocks, etc.).
 */
export function extractContent(entry) {
  if (!entry) return '';

  // Direct message content
  if (typeof entry.message === 'string') return entry.message;

  // Content field (string or array)
  const content = entry.content || entry.message?.content;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block.type === 'text') return block.text || '';
        if (block.type === 'tool_use') return JSON.stringify(block.input || {});
        if (block.type === 'tool_result') {
          if (typeof block.content === 'string') return block.content;
          if (Array.isArray(block.content)) {
            return block.content.map((c) => c.text || '').join('\n');
          }
        }
        return '';
      })
      .join('\n');
  }

  // Fallback: stringify the whole entry
  return JSON.stringify(entry);
}

/**
 * Extract file paths mentioned in the transcript.
 * Looks for tool calls that reference files (Read, Edit, Write, Glob, etc.).
 */
export function extractFilePaths(entries) {
  const files = {
    read: new Set(),
    modified: new Set(),
    created: new Set(),
  };

  for (const entry of entries) {
    const toolName = entry.tool_name || entry.name || entry.tool;
    const input = entry.tool_input || entry.input || entry.parameters || {};

    if (!toolName) continue;

    const filePath = input.file_path || input.filePath || input.path || input.file;
    if (!filePath) continue;

    switch (toolName) {
      case 'Read':
      case 'read':
        files.read.add(filePath);
        break;
      case 'Edit':
      case 'edit':
        files.modified.add(filePath);
        break;
      case 'Write':
      case 'write':
        files.created.add(filePath);
        break;
      default:
        files.read.add(filePath);
    }
  }

  return {
    read: [...files.read],
    modified: [...files.modified],
    created: [...files.created],
  };
}

/**
 * Get total character count from all transcript entries.
 */
export function getTotalCharCount(entries) {
  let total = 0;
  for (const entry of entries) {
    total += extractContent(entry).length;
  }
  return total;
}
