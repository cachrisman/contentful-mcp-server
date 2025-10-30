import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const DeleteAiActionToolParams = BaseToolSchema.extend({
  aiActionId: z.string().describe('The ID of the AI action to delete'),
});

type Params = z.infer<typeof DeleteAiActionToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    aiActionId: args.aiActionId,
  };

  // First, get the AI action to store info for return
  const aiAction = await client.aiAction.get(params);

  // Delete the AI action
  await client.aiAction.delete(params);

  return createSuccessResponse('AI action deleted successfully', { aiAction });
}

export const deleteAiActionTool = withErrorHandling(
  tool,
  'Error deleting AI action',
);
