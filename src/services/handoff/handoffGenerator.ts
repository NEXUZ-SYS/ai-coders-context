/**
 * Handoff Generator
 *
 * Generates formatted handoff prompts from context snapshots.
 * These prompts are injected into new Claude sessions via SessionStart hook.
 */

import type { ContextSnapshot, HandoffTrigger } from './types';

export interface HandoffMetadata {
  fromSessionId?: string;
  savedAt?: string;
  trigger?: HandoffTrigger;
  usagePercent?: number;
}

const TRIGGER_LABELS: Record<string, string> = {
  'proactive-threshold': 'Threshold proativo atingido',
  'pre-compact': 'Pre-compactação (safety net)',
  'stop-handler': 'Stop handler detectou threshold',
  'manual': 'Handoff manual',
  'wrapper': 'Wrapper script (modo autônomo)',
};

/**
 * Generate a full handoff prompt from a context snapshot.
 */
export function generateHandoffPrompt(snapshot: ContextSnapshot, metadata: HandoffMetadata = {}): string {
  const sections: string[] = [];

  sections.push('## Contexto Restaurado (Auto-Handoff)\n');

  if (metadata.fromSessionId) sections.push(`**Sessão anterior**: ${metadata.fromSessionId}`);
  if (metadata.savedAt) sections.push(`**Salvo em**: ${metadata.savedAt}`);
  if (metadata.trigger) sections.push(`**Motivo**: ${TRIGGER_LABELS[metadata.trigger] || metadata.trigger}`);
  if (metadata.usagePercent) sections.push(`**Uso de contexto na saída**: ${metadata.usagePercent}%`);
  sections.push('');

  if (snapshot.currentTask) {
    sections.push(`### Tarefa em Andamento\n${snapshot.currentTask}\n`);
  }

  if (snapshot.progress.length > 0) {
    sections.push('### Progresso');
    for (const item of snapshot.progress) {
      sections.push(`- ${item.status === 'done' ? '✅' : '🔄'} ${item.text}`);
    }
    sections.push('');
  }

  const hasFiles = (snapshot.filesModified?.length > 0)
    || (snapshot.filesCreated?.length > 0)
    || (snapshot.filesRead?.length > 0);

  if (hasFiles) {
    sections.push('### Arquivos Relevantes');
    if (snapshot.filesCreated?.length > 0) {
      sections.push('**Criados:**');
      for (const f of snapshot.filesCreated.slice(0, 15)) sections.push(`- \`${f}\``);
    }
    if (snapshot.filesModified?.length > 0) {
      sections.push('**Modificados:**');
      for (const f of snapshot.filesModified.slice(0, 15)) sections.push(`- \`${f}\``);
    }
    if (snapshot.filesRead?.length > 0) {
      sections.push('**Lidos:**');
      for (const f of snapshot.filesRead.slice(0, 10)) sections.push(`- \`${f}\``);
    }
    sections.push('');
  }

  if (snapshot.decisions.length > 0) {
    sections.push('### Decisões Tomadas');
    snapshot.decisions.forEach((d, i) => sections.push(`${i + 1}. ${d}`));
    sections.push('');
  }

  const unresolvedErrors = snapshot.errors.filter((e) => !e.resolved);
  if (unresolvedErrors.length > 0) {
    sections.push('### Erros Não Resolvidos');
    for (const err of unresolvedErrors) sections.push(`- ${err.content}`);
    sections.push('');
  }

  if (snapshot.keyContext) {
    sections.push('### Contexto Recente');
    sections.push(snapshot.keyContext.slice(0, 3000));
    if (snapshot.keyContext.length > 3000) sections.push('...(truncado)');
    sections.push('');
  }

  if (snapshot.stats) {
    sections.push('### Estatísticas');
    sections.push(`- Mensagens: ${snapshot.stats.userMessages} user / ${snapshot.stats.assistantMessages} assistant`);
    sections.push(`- Tool calls: ${snapshot.stats.toolCalls}`);
    sections.push('');
  }

  sections.push('### Instruções');
  sections.push('Continue o trabalho de onde parou. Revise os arquivos listados se necessário.');
  sections.push('');

  return sections.join('\n');
}

/**
 * Generate a minimal handoff prompt (for emergency/pre-compact scenarios).
 */
export function generateMinimalHandoff(snapshot: ContextSnapshot, metadata: HandoffMetadata = {}): string {
  const parts: string[] = [
    '## Auto-Handoff (Emergency Recovery)\n',
    `Sessão anterior interrompida por ${metadata.trigger || 'compactação'}.`,
    '',
  ];

  if (snapshot.currentTask) parts.push(`**Tarefa**: ${snapshot.currentTask.slice(0, 200)}`);
  if (snapshot.filesModified?.length > 0) parts.push(`**Modificados**: ${snapshot.filesModified.slice(0, 5).join(', ')}`);
  if (snapshot.filesCreated?.length > 0) parts.push(`**Criados**: ${snapshot.filesCreated.slice(0, 5).join(', ')}`);
  parts.push('', 'Verifique o estado atual dos arquivos e continue o trabalho.');

  return parts.join('\n');
}
