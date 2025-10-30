import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const GetAiActionInvocationToolParams = BaseToolSchema.extend({
  aiActionId: z.string().describe('The ID of the AI action'),
  invocationId: z.string().describe('The ID of the invocation to retrieve'),
});

type Params = z.infer<typeof GetAiActionInvocationToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    aiActionId: args.aiActionId,
    invocationId: args.invocationId,
  };

  const aiActionInvocation = await client.aiActionInvocation.get(params);

  return createSuccessResponse('AI action invocation retrieved successfully', {
    aiActionInvocation,
  });
}

export const getAiActionInvocationTool = withErrorHandling(
  tool,
  'Error retrieving AI action invocation',
);
