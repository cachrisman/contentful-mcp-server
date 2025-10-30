import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const GetAssetToolParams = BaseToolSchema.extend({
  assetId: z.string().describe('The ID of the asset to retrieve'),
});

type Params = z.infer<typeof GetAssetToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);

  // Get the asset
  const asset = await client.asset.get({
    spaceId,
    environmentId,
    assetId: args.assetId,
  });

  return createSuccessResponse('Asset retrieved successfully', { asset });
}

export const getAssetTool = withErrorHandling(tool, 'Error retrieving asset');
