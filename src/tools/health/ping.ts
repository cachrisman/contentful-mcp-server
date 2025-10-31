import { z } from 'zod';
import {
  createSuccessResponse,
  withErrorHandling,
} from '../../utils/response.js';
import { BaseToolSchema, createToolClient } from '../../utils/tools.js';
import { VERSION } from '../../config/version.js';

export const PingToolParams = BaseToolSchema.extend({
  // No additional params needed
});

type Params = z.infer<typeof PingToolParams>;

/**
 * Health check tool that verifies tenant credentials and Contentful connectivity.
 * This is useful for:
 * - Verifying tenant credentials are valid
 * - Checking Contentful API availability
 * - Monitoring and alerting
 */
async function tool(args: Params) {
  // This will validate tenant credentials and create a client
  const contentfulClient = createToolClient(args);

  // Get spaceId and environmentId from either tenant or direct args (legacy mode)
  const spaceId = args.tenant?.SPACE_ID || args.spaceId;
  const environmentId = args.tenant?.ENVIRONMENT_ID || args.environmentId;

  // Try to fetch space to verify connectivity and auth
  const space = await contentfulClient.space.get({
    spaceId,
  });

  return createSuccessResponse('Ping successful', {
    status: 'healthy',
    version: VERSION,
    space: {
      id: space.sys.id,
      name: space.name,
    },
    environment: environmentId,
    timestamp: new Date().toISOString(),
  });
}

export const pingTool = withErrorHandling(
  tool,
  'Health check failed. This may indicate invalid credentials or Contentful API issues',
);
