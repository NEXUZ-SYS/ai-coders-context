/**
 * Transcript Reader
 *
 * Reads and parses Claude Code transcript files (JSONL format).
 */

import * as fs from 'fs';
import type {
  TranscriptEntry,
  CategorizedMessages,
  ContentBlock,
  TrackedFiles,
} from './types';

/**
 * Reads and parses a Claude Code transcript file (JSONL format).
 */
export function readTranscript(transcriptPath: string): TranscriptEntry[] {
  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: TranscriptEntry[] = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // Skip malformed lines
      }
    }

    return entries;
  } catch {
    return [];
  }
}

/**
 * Get transcript file size in bytes (quick check without reading).
 */
export function getTranscriptSize(transcriptPath: string): number {
  try {
    return fs.statSync(transcriptPath).size;
  } catch {
    return 0;
  }
}

/**
 * Extract and categorize messages from transcript entries.
 */
export function extractMessages(entries: TranscriptEntry[]): CategorizedMessages {
  const messages: CategorizedMessages = {
    user: [],
    assistant: [],
    toolUse: [],
    toolResult: [],
    system: [],
    other: [],
  };

  for (const entry of entries) {
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
 */
export function extractContent(entry: TranscriptEntry | null | undefined): string {
  if (!entry) return '';

  if (typeof entry.message === 'string') return entry.message;

  const content = entry.content || (entry.message as { content?: string | ContentBlock[] })?.content;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return (content as ContentBlock[])
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block.type === 'text') return block.text || '';
        if (block.type === 'tool_use') return JSON.stringify(block.input || {});
        if (block.type === 'tool_result') {
          if (typeof block.content === 'string') return block.content;
          if (Array.isArray(block.content)) {
            return (block.content as ContentBlock[]).map((c) => c.text || '').join('\n');
          }
        }
        return '';
      })
      .join('\n');
  }

  return JSON.stringify(entry);
}

/**
 * Extract file paths mentioned in tool calls.
 */
export function extractFilePaths(entries: TranscriptEntry[]): TrackedFiles {
  const files: { read: Set<string>; modified: Set<string>; created: Set<string> } = {
    read: new Set(),
    modified: new Set(),
    created: new Set(),
  };

  for (const entry of entries) {
    const toolName = entry.tool_name || entry.name || entry.tool;
    const input = entry.tool_input || entry.input || entry.parameters || {};
    if (!toolName) continue;

    const filePath = (input as Record<string, string>).file_path
      || (input as Record<string, string>).filePath
      || (input as Record<string, string>).path
      || (input as Record<string, string>).file;
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
export function getTotalCharCount(entries: TranscriptEntry[]): number {
  let total = 0;
  for (const entry of entries) {
    total += extractContent(entry).length;
  }
  return total;
}
