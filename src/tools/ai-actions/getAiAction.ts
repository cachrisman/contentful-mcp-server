import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const GetAiActionToolParams = BaseToolSchema.extend({
  aiActionId: z.string().describe('The ID of the AI action to retrieve'),
});

type Params = z.infer<typeof GetAiActionToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    aiActionId: args.aiActionId,
  };

  // Get the AI action
  const aiAction = await client.aiAction.get(params);

  return createSuccessResponse('AI action retrieved successfully', {
    aiAction,
  });
}

export const getAiActionTool = withErrorHandling(
  tool,
  'Error retrieving AI action',
);
