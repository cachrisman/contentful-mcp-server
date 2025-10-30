import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const UnpublishAiActionToolParams = BaseToolSchema.extend({
  aiActionId: z.string().describe('The ID of the AI action to unpublish'),
});

type Params = z.infer<typeof UnpublishAiActionToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    aiActionId: args.aiActionId,
  };

  try {
    // Unpublish the AI action
    await client.aiAction.unpublish(params);

    return createSuccessResponse('AI action unpublished successfully', {
      aiActionId: args.aiActionId,
    });
  } catch (error) {
    return createSuccessResponse('AI action unpublish failed', {
      status: error,
      aiActionId: args.aiActionId,
    });
  }
}

export const unpublishAiActionTool = withErrorHandling(
  tool,
  'Error unpublishing AI action',
);
