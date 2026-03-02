/**
 * Handoff Gateway Handler
 *
 * Handles auto-handoff context preservation operations.
 * Follows the project's gateway pattern (action-based routing).
 */

import { HandoffService } from '../../handoff';
import type { MCPToolResponse } from './response';
import { createJsonResponse, createErrorResponse } from './response';

export type HandoffAction = 'install' | 'uninstall' | 'status' | 'config' | 'clean' | 'trigger';

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
        const result = await service.install(target);

        return createJsonResponse({
          ...result,
          message: `Auto-handoff hooks installed (${target})`,
          nextSteps: [
            'Hooks are now active. Context will be preserved automatically.',
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

        return createJsonResponse({
          success: true,
          installed: status.installed,
          enabled: status.enabled,
          session: status.session ? {
            sessionId: status.session.sessionId,
            estimatedTokens: status.session.estimatedTokens,
            usagePercent: status.session.usagePercent,
            toolCallCount: status.session.toolCallCount,
            contextStatus: status.session.contextStatus,
            thresholdReached: status.session.thresholdReached,
          } : null,
          health: status.health,
          handoffPending: status.handoffPending,
          sessionsArchived: status.sessionsArchived,
          ...(!status.installed && {
            suggestion: 'Use handoff({ action: "install" }) to enable auto-handoff.',
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

      default:
        return createErrorResponse(`Unknown handoff action: ${params.action}`);
    }
  } catch (error) {
    return createErrorResponse(error);
  }
}
