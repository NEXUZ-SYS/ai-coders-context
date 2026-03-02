import { loadConfig } from '../utils/config-loader.mjs';
import { logger } from '../utils/logger.mjs';
import { extractContent, extractFilePaths, extractMessages } from './transcript-reader.mjs';

const COMPONENT = 'context-summarizer';

/**
 * Summarize a conversation transcript into a compact handoff snapshot.
 * Extracts: current task, files, progress, decisions, key context.
 */
export function summarizeTranscript(entries) {
  const config = loadConfig();
  const messages = extractMessages(entries);
  const files = extractFilePaths(entries);

  const snapshot = {
    currentTask: extractCurrentTask(messages),
    filesModified: files.modified.slice(0, config.snapshot.maxFilesTracked),
    filesRead: files.read.slice(0, config.snapshot.maxFilesTracked),
    filesCreated: files.created.slice(0, config.snapshot.maxFilesTracked),
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

  logger.info(COMPONENT, 'Transcript summarized', {
    files: files.modified.length + files.created.length,
    messages: entries.length,
  });

  return snapshot;
}

/**
 * Extract the most recent task description from user messages.
 */
function extractCurrentTask(messages) {
  // Look at user messages in reverse for the most recent substantial prompt
  const userMessages = [...messages.user].reverse();

  for (const msg of userMessages) {
    const content = extractContent(msg);
    if (content.length > 20) {
      // Truncate to reasonable length
      return content.slice(0, 500);
    }
  }

  return 'Tarefa não identificada';
}

/**
 * Extract progress indicators from assistant messages.
 * Looks for patterns like checkmarks, "done", "completed", "next", task lists.
 */
function extractProgress(messages) {
  const progress = [];
  const progressPatterns = [
    /[✅✓☑️]\s*(.+)/g,
    /(?:done|completed|finished|concluí[do]|pronto|feito):\s*(.+)/gi,
    /(?:created|criado|implementado|added|adicionado)\s+(.+)/gi,
  ];

  const pendingPatterns = [
    /[⬚☐🔄]\s*(.+)/g,
    /(?:todo|pending|next|próximo|falta|restante):\s*(.+)/gi,
    /(?:need to|preciso|ainda falta)\s+(.+)/gi,
  ];

  // Scan assistant messages for progress markers
  for (const msg of messages.assistant.slice(-10)) {
    const content = extractContent(msg);

    for (const pattern of progressPatterns) {
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

/**
 * Extract key decisions from the conversation.
 * Looks for decision-related keywords in assistant messages.
 */
function extractDecisions(messages) {
  const decisions = [];
  const decisionPatterns = [
    /(?:decid[io]|escolh[io]|opt[ei]|vou usar|usando|chosen|decided|will use)\s+(.+?)(?:\.|$)/gi,
    /(?:approach|abordagem|estratégia|strategy):\s*(.+?)(?:\.|$)/gi,
    /(?:instead of|ao invés de|em vez de)\s+.+?,?\s*(.+?)(?:\.|$)/gi,
  ];

  for (const msg of messages.assistant) {
    const content = extractContent(msg);

    for (const pattern of decisionPatterns) {
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

/**
 * Extract errors encountered and their resolutions.
 */
function extractErrors(messages) {
  const errors = [];

  for (const msg of messages.toolResult || []) {
    const content = extractContent(msg);
    if (content.toLowerCase().includes('error') || content.toLowerCase().includes('erro')) {
      errors.push({
        content: content.slice(0, 300),
        resolved: false,
      });
    }
  }

  return errors.slice(0, 10);
}

/**
 * Extract the most important recent context from the conversation.
 * Focuses on the last few exchanges for relevance.
 */
function extractKeyContext(messages, maxTokens) {
  const maxChars = maxTokens * 3.5;
  const parts = [];
  let currentLength = 0;

  // Get the last N assistant messages (most relevant context)
  const recentAssistant = messages.assistant.slice(-5);

  for (const msg of recentAssistant) {
    const content = extractContent(msg);
    if (currentLength + content.length > maxChars) {
      // Truncate to fit
      const remaining = maxChars - currentLength;
      if (remaining > 100) {
        parts.push(content.slice(0, remaining) + '...');
      }
      break;
    }
    parts.push(content);
    currentLength += content.length;
  }

  return parts.join('\n\n---\n\n');
}
