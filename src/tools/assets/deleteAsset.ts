import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const DeleteAssetToolParams = BaseToolSchema.extend({
  assetId: z.string().describe('The ID of the asset to delete'),
});

type Params = z.infer<typeof DeleteAssetToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    assetId: args.assetId,
  };

  // First, get the asset to store info for return
  const asset = await client.asset.get(params);

  // Delete the asset
  await client.asset.delete(params);

  return createSuccessResponse('Asset deleted successfully', { asset });
}

export const deleteAssetTool = withErrorHandling(tool, 'Error deleting asset');
