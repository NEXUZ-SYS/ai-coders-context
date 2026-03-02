import { logger } from '../utils/logger.mjs';

const COMPONENT = 'handoff-generator';

/**
 * Generate a handoff prompt from a context snapshot.
 * This prompt will be injected into the next Claude session.
 */
export function generateHandoffPrompt(snapshot, metadata = {}) {
  const sections = [];

  // Header
  sections.push(`## Contexto Restaurado (Auto-Handoff)\n`);

  if (metadata.fromSessionId) {
    sections.push(`**Sessão anterior**: ${metadata.fromSessionId}`);
  }
  if (metadata.savedAt) {
    sections.push(`**Salvo em**: ${metadata.savedAt}`);
  }
  if (metadata.trigger) {
    const triggerLabels = {
      'proactive-threshold': 'Threshold proativo atingido',
      'pre-compact': 'Pre-compactação (safety net)',
      'stop-handler': 'Stop handler detectou threshold',
      'manual': 'Handoff manual',
      'wrapper': 'Wrapper script (modo autônomo)',
    };
    sections.push(`**Motivo**: ${triggerLabels[metadata.trigger] || metadata.trigger}`);
  }
  if (metadata.usagePercent) {
    sections.push(`**Uso de contexto na saída**: ${metadata.usagePercent}%`);
  }

  sections.push('');

  // Current Task
  if (snapshot.currentTask) {
    sections.push(`### Tarefa em Andamento\n${snapshot.currentTask}\n`);
  }

  // Progress
  if (snapshot.progress && snapshot.progress.length > 0) {
    sections.push('### Progresso');
    for (const item of snapshot.progress) {
      const icon = item.status === 'done' ? '✅' : '🔄';
      sections.push(`- ${icon} ${item.text}`);
    }
    sections.push('');
  }

  // Files
  const hasFiles =
    (snapshot.filesModified?.length > 0) ||
    (snapshot.filesCreated?.length > 0) ||
    (snapshot.filesRead?.length > 0);

  if (hasFiles) {
    sections.push('### Arquivos Relevantes');

    if (snapshot.filesCreated?.length > 0) {
      sections.push('**Criados nesta sessão:**');
      for (const f of snapshot.filesCreated.slice(0, 15)) {
        sections.push(`- \`${f}\``);
      }
    }

    if (snapshot.filesModified?.length > 0) {
      sections.push('**Modificados nesta sessão:**');
      for (const f of snapshot.filesModified.slice(0, 15)) {
        sections.push(`- \`${f}\``);
      }
    }

    if (snapshot.filesRead?.length > 0) {
      sections.push('**Lidos (referência):**');
      for (const f of snapshot.filesRead.slice(0, 10)) {
        sections.push(`- \`${f}\``);
      }
    }

    sections.push('');
  }

  // Decisions
  if (snapshot.decisions && snapshot.decisions.length > 0) {
    sections.push('### Decisões Tomadas');
    for (let i = 0; i < snapshot.decisions.length; i++) {
      sections.push(`${i + 1}. ${snapshot.decisions[i]}`);
    }
    sections.push('');
  }

  // Errors
  if (snapshot.errors && snapshot.errors.length > 0) {
    const unresolvedErrors = snapshot.errors.filter((e) => !e.resolved);
    if (unresolvedErrors.length > 0) {
      sections.push('### Erros Encontrados (não resolvidos)');
      for (const err of unresolvedErrors) {
        sections.push(`- ${err.content}`);
      }
      sections.push('');
    }
  }

  // Key Context (compact summary)
  if (snapshot.keyContext) {
    sections.push('### Contexto Recente (resumo)');
    // Limit key context to avoid bloating the handoff prompt
    const truncated = snapshot.keyContext.slice(0, 3000);
    sections.push(truncated);
    if (snapshot.keyContext.length > 3000) {
      sections.push('...(truncado)');
    }
    sections.push('');
  }

  // Stats
  if (snapshot.stats) {
    sections.push('### Estatísticas da Sessão Anterior');
    sections.push(`- Mensagens do usuário: ${snapshot.stats.userMessages}`);
    sections.push(`- Respostas do assistente: ${snapshot.stats.assistantMessages}`);
    sections.push(`- Tool calls: ${snapshot.stats.toolCalls}`);
    sections.push(`- Total de mensagens: ${snapshot.stats.totalMessages}`);
    sections.push('');
  }

  // Instructions for continuing
  sections.push('### Instruções');
  sections.push('Continue o trabalho de onde parou. Revise os arquivos listados acima se necessário.');
  sections.push('O contexto acima foi gerado automaticamente pelo sistema de auto-handoff.');
  sections.push('');

  const prompt = sections.join('\n');

  logger.info(COMPONENT, `Handoff prompt generated: ${prompt.length} chars`);

  return prompt;
}

/**
 * Generate a minimal handoff prompt (for emergency/pre-compact scenarios).
 */
export function generateMinimalHandoff(snapshot, metadata = {}) {
  const parts = [
    '## Auto-Handoff (Emergency Recovery)\n',
    `Sessão anterior interrompida por ${metadata.trigger || 'compactação'}.`,
    '',
  ];

  if (snapshot.currentTask) {
    parts.push(`**Tarefa**: ${snapshot.currentTask.slice(0, 200)}`);
  }

  if (snapshot.filesModified?.length > 0) {
    parts.push(`**Arquivos modificados**: ${snapshot.filesModified.slice(0, 5).join(', ')}`);
  }

  if (snapshot.filesCreated?.length > 0) {
    parts.push(`**Arquivos criados**: ${snapshot.filesCreated.slice(0, 5).join(', ')}`);
  }

  parts.push('');
  parts.push('Verifique o estado atual dos arquivos e continue o trabalho.');

  return parts.join('\n');
}
