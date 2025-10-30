import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const DeleteEntryToolParams = BaseToolSchema.extend({
  entryId: z.string().describe('The ID of the entry to delete'),
});

type Params = z.infer<typeof DeleteEntryToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    entryId: args.entryId,
  };

  // First, get the entry to check its status
  const entry = await client.entry.get(params);

  // Delete the entry
  await client.entry.delete(params);

  //return info about the entry that was deleted
  return createSuccessResponse('Entry deleted successfully', { entry });
}

export const deleteEntryTool = withErrorHandling(tool, 'Error deleting entry');
