/**
 * Context Summarizer
 *
 * Extracts a compact snapshot from a conversation transcript.
 */

import type {
  TranscriptEntry,
  ContextSnapshot,
  HandoffConfig,
  ProgressItem,
  ErrorItem,
} from './types';
import { extractMessages, extractContent, extractFilePaths } from './transcriptReader';

/**
 * Summarize a conversation transcript into a compact handoff snapshot.
 */
export function summarizeTranscript(
  entries: TranscriptEntry[],
  config: HandoffConfig
): ContextSnapshot {
  const messages = extractMessages(entries);
  const files = extractFilePaths(entries);
  const maxFiles = config.snapshot.maxFilesTracked;

  return {
    currentTask: extractCurrentTask(messages),
    filesModified: files.modified.slice(0, maxFiles),
    filesRead: files.read.slice(0, maxFiles),
    filesCreated: files.created.slice(0, maxFiles),
    progress: extractProgress(messages),
    decisions: extractDecisions(messages),
    errors: extractErrors(messages),
    keyContext: extractKeyContext(messages, config.snapshot.maxSummaryTokens),
    stats: {
      totalMessages: entries.length,
      userMessages: messages.user.length,
      assistantMessages: messages.assistant.length,
      toolCalls: messages.toolUse.length,
    },
  };
}

function extractCurrentTask(messages: ReturnType<typeof extractMessages>): string {
  const userMessages = [...messages.user].reverse();
  for (const msg of userMessages) {
    const content = extractContent(msg);
    if (content.length > 20) return content.slice(0, 500);
  }
  return 'Tarefa não identificada';
}

function extractProgress(messages: ReturnType<typeof extractMessages>): ProgressItem[] {
  const progress: ProgressItem[] = [];
  const donePatterns = [
    /[✅✓☑️]\s*(.+)/g,
    /(?:done|completed|finished|concluí[do]|pronto|feito):\s*(.+)/gi,
    /(?:created|criado|implementado|added|adicionado)\s+(.+)/gi,
  ];
  const pendingPatterns = [
    /[⬚☐🔄]\s*(.+)/g,
    /(?:todo|pending|next|próximo|falta|restante):\s*(.+)/gi,
  ];

  for (const msg of messages.assistant.slice(-10)) {
    const content = extractContent(msg);
    for (const pattern of donePatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const item = match[1].trim().slice(0, 200);
        if (item && !progress.some((p) => p.text === item)) {
          progress.push({ status: 'done', text: item });
        }
      }
    }
    for (const pattern of pendingPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const item = match[1].trim().slice(0, 200);
        if (item && !progress.some((p) => p.text === item)) {
          progress.push({ status: 'pending', text: item });
        }
      }
    }
  }

  return progress.slice(0, 20);
}

function extractDecisions(messages: ReturnType<typeof extractMessages>): string[] {
  const decisions: string[] = [];
  const patterns = [
    /(?:decid[io]|escolh[io]|opt[ei]|vou usar|usando|chosen|decided|will use)\s+(.+?)(?:\.|$)/gi,
    /(?:approach|abordagem|estratégia|strategy):\s*(.+?)(?:\.|$)/gi,
  ];

  for (const msg of messages.assistant) {
    const content = extractContent(msg);
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const decision = match[1].trim().slice(0, 300);
        if (decision && decision.length > 10 && !decisions.includes(decision)) {
          decisions.push(decision);
        }
      }
    }
  }

  return decisions.slice(0, 10);
}

function extractErrors(messages: ReturnType<typeof extractMessages>): ErrorItem[] {
  const errors: ErrorItem[] = [];
  for (const msg of messages.toolResult) {
    const content = extractContent(msg);
    if (content.toLowerCase().includes('error') || content.toLowerCase().includes('erro')) {
      errors.push({ content: content.slice(0, 300), resolved: false });
    }
  }
  return errors.slice(0, 10);
}

function extractKeyContext(
  messages: ReturnType<typeof extractMessages>,
  maxTokens: number
): string {
  const maxChars = maxTokens * 3.5;
  const parts: string[] = [];
  let currentLength = 0;

  for (const msg of messages.assistant.slice(-5)) {
    const content = extractContent(msg);
    if (currentLength + content.length > maxChars) {
      const remaining = maxChars - currentLength;
      if (remaining > 100) parts.push(content.slice(0, remaining) + '...');
      break;
    }
    parts.push(content);
    currentLength += content.length;
  }

  return parts.join('\n\n---\n\n');
}
