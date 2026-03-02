/**
 * Handoff Gateway Handler
 *
 * Handles auto-handoff context preservation operations.
 * Follows the project's gateway pattern (action-based routing).
 */

import { HandoffService } from '../../handoff';
import { diagnoseHandoff } from '../../handoff/hookInstaller';
import { setupHandoffTool } from '../../ai/tools';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';
import { toolContext } from './shared';

export type HandoffAction = 'install' | 'uninstall' | 'status' | 'config' | 'clean' | 'trigger' | 'setup' | 'diagnose';

export interface HandoffParams {
  action: HandoffAction;
  repoPath?: string;
  target?: 'project' | 'user';
  contextLimit?: number;
  proactiveThreshold?: number;
  reactiveThreshold?: number;
  debug?: boolean;
  reason?: string;
}

export interface HandoffOptions {
  repoPath: string;
}

/**
 * Handle auto-handoff operations.
 */
export async function handleHandoff(
  params: HandoffParams,
  options: HandoffOptions
): Promise<MCPToolResponse> {
  try {
    const repoPath = params.repoPath || options.repoPath;
    const service = new HandoffService(repoPath);

    switch (params.action) {
      case 'install': {
        const target = params.target || 'project';
        const preDiagnosis = diagnoseHandoff(repoPath);
        const result = await service.install(target);

        const isUpgrade = result.upgraded;
        const levelBefore = preDiagnosis.level;
        const message = isUpgrade
          ? `Auto-handoff upgraded from '${levelBefore}' to 'full' (${target})`
          : `Auto-handoff hooks installed (${target})`;

        return createJsonResponse({
          ...result,
          previousLevel: levelBefore,
          currentLevel: 'full',
          message,
          nextSteps: [
            'Hooks are now active. Context will be preserved automatically by token counting.',
            'Protection: Stop(80%) + PreCompact(95%) + SessionStart(restore)',
            'Use handoff({ action: "status" }) to check context health.',
            'Use handoff({ action: "config" }) to adjust thresholds.',
          ],
        });
      }

      case 'uninstall': {
        const target = params.target || 'project';
        await service.uninstall(target);

        return createJsonResponse({
          success: true,
          message: `Auto-handoff hooks removed (${target})`,
        });
      }

      case 'status': {
        const status = await service.getStatus();
        const diagnosis = diagnoseHandoff(repoPath);
        const config = status.config;
        const health = status.health;

        // Calculate remaining context before auto-handoff kicks in
        const proactiveLimit = Math.floor(config.contextLimit * config.proactiveThreshold / 100);
        const usedTokens = health?.estimatedTokens ?? status.session?.estimatedTokens ?? 0;
        const tokensBeforeHandoff = Math.max(0, proactiveLimit - usedTokens);
        const percentBeforeHandoff = config.contextLimit > 0
          ? Math.max(0, parseFloat((config.proactiveThreshold - (health?.usagePercent ?? status.session?.usagePercent ?? 0)).toFixed(1)))
          : 0;

        return createJsonResponse({
          success: true,
          level: diagnosis.level,
          installed: status.installed,
          enabled: status.enabled,
          contextRemaining: {
            tokensUsed: usedTokens,
            tokensBeforeHandoff,
            percentBeforeHandoff,
            contextLimit: config.contextLimit,
            proactiveThreshold: `${config.proactiveThreshold}%`,
            summary: usedTokens > 0
              ? `${tokensBeforeHandoff.toLocaleString()} tokens (${percentBeforeHandoff}%) restantes antes do auto-handoff (threshold: ${config.proactiveThreshold}%)`
              : `Auto-handoff ativa em ${proactiveLimit.toLocaleString()} tokens (${config.proactiveThreshold}% de ${config.contextLimit.toLocaleString()})`,
          },
          session: status.session ? {
            sessionId: status.session.sessionId,
            estimatedTokens: status.session.estimatedTokens,
            usagePercent: status.session.usagePercent,
            toolCallCount: status.session.toolCallCount,
            contextStatus: status.session.contextStatus,
            thresholdReached: status.session.thresholdReached,
          } : null,
          health: health ? {
            status: health.status,
            estimatedTokens: health.estimatedTokens,
            usagePercent: health.usagePercent,
            remainingTokens: health.remainingTokens,
          } : null,
          handoffPending: status.handoffPending,
          sessionsArchived: status.sessionsArchived,
          ...(diagnosis.level !== 'full' && {
            suggestion: diagnosis.level === 'none'
              ? 'Use handoff({ action: "install" }) to enable auto-handoff.'
              : `Current level: '${diagnosis.level}'. Use handoff({ action: "install" }) to upgrade to full auto-handoff with token counting.`,
            missing: diagnosis.missing,
          }),
        });
      }

      case 'config': {
        // If parameters provided, update config
        const updates: Record<string, unknown> = {};
        if (params.contextLimit !== undefined) updates.contextLimit = params.contextLimit;
        if (params.proactiveThreshold !== undefined) updates.proactiveThreshold = params.proactiveThreshold;
        if (params.reactiveThreshold !== undefined) updates.reactiveThreshold = params.reactiveThreshold;
        if (params.debug !== undefined) updates.debug = params.debug;

        let config;
        if (Object.keys(updates).length > 0) {
          config = service.updateConfig(updates);
          return createJsonResponse({
            success: true,
            message: 'Configuration updated',
            config,
          });
        }

        config = service.getConfig();
        return createJsonResponse({
          success: true,
          config,
        });
      }

      case 'clean': {
        const result = await service.clean();

        return createJsonResponse({
          success: true,
          message: 'Handoff state cleaned',
          ...result,
        });
      }

      case 'trigger': {
        await service.triggerHandoff(params.reason);

        return createJsonResponse({
          success: true,
          message: 'Handoff triggered manually',
          reason: params.reason || 'Manual trigger via MCP',
          instruction: 'A new session should be started to restore the saved context.',
        });
      }

      case 'setup': {
        const result = await setupHandoffTool.execute!(
          { repoPath },
          toolContext
        );

        return createJsonResponse({
          ...result,
          nextSteps: [
            'AGENTS.md updated with handoff snippet.',
            'Handoff skill copied to .context/skills/handoff/.',
            'For full auto-handoff protection (token counting + hooks), use handoff({ action: "install" }).',
          ],
        });
      }

      case 'diagnose': {
        const diagnosis = diagnoseHandoff(repoPath);

        const levelDescriptions: Record<string, string> = {
          'none': 'Nenhum handoff configurado',
          'skill-only': 'Apenas skill/docs (handoff manual, sem protecao automatica)',
          'partial': 'Parcial (alguns hooks presentes, instalacao incompleta)',
          'full': 'Completo (hooks + contagem de tokens + protecao automatica)',
        };

        return createJsonResponse({
          success: true,
          level: diagnosis.level,
          levelDescription: levelDescriptions[diagnosis.level],
          components: {
            skill: diagnosis.hasSkill,
            skillNeedsUpdate: diagnosis.skillNeedsUpdate,
            agentsSnippet: diagnosis.hasAgentsSnippet,
            agentsMarkers: diagnosis.hasAgentsMarkers,
            hookScripts: diagnosis.hasHookScripts,
            hooksInSettings: diagnosis.hasHooksInSettings,
            config: diagnosis.hasConfig,
            stateDir: diagnosis.hasStateDir,
          },
          missing: diagnosis.missing,
          ...(diagnosis.level !== 'full' && {
            recommendation: 'Use handoff({ action: "install" }) to upgrade to full auto-handoff protection.',
          }),
        });
      }

      default:
        return createErrorResponse(`Unknown handoff action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
