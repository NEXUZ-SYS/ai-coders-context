import { tool } from 'ai';
import { SetupHandoffInputSchema, type SetupHandoffInput } from '../schemas';
import { injectAgentsSnippet, copyHandoffSkill } from '../../handoff';

export const setupHandoffTool = tool({
  description: 'Set up handoff documentation in a project (AGENTS.md snippet + skill copy). Lightweight — no hooks installed.',
  inputSchema: SetupHandoffInputSchema,
  execute: async (input: SetupHandoffInput) => {
    const { repoPath } = input;
    try {
      injectAgentsSnippet(repoPath);
      const skillCopied = copyHandoffSkill(repoPath);
      return {
        success: true,
        agentsInjected: true,
        skillCopied,
        message: 'Handoff documentation set up successfully',
      };
    } catch (error) {
      return {
        success: false,
        agentsInjected: false,
        skillCopied: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
});
