import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';

export const GetLocaleToolParams = BaseToolSchema.extend({
  localeId: z.string().describe('The ID of the locale to retrieve'),
});

type Params = z.infer<typeof GetLocaleToolParams>;

async function tool(args: Params) {
  const { client, spaceId, environmentId } = await createToolClient(args);
  const params = {
    spaceId,
    environmentId,
    localeId: args.localeId,
  };

  // Get the locale
  const locale = await client.locale.get(params);

  return createSuccessResponse('Locale retrieved successfully', { locale });
}

export const getLocaleTool = withErrorHandling(tool, 'Error retrieving locale');
