import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const DeleteLocaleToolParams = BaseToolSchema.extend({
  localeId: z.string().describe('The ID of the locale to delete'),
});

type Params = z.infer<typeof DeleteLocaleToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    localeId: args.localeId,
  };

  // First, get the locale to check its current state
  const locale = await client.locale.get(params);

  // Delete the locale
  await client.locale.delete(params);

  // Return info about the locale that was deleted
  return createSuccessResponse('Locale deleted successfully', { locale });
}

export const deleteLocaleTool = withErrorHandling(
  tool,
  'Error deleting locale',
);
