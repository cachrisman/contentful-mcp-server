import ctfl from 'contentful-management';
import { getDefaultClientConfig } from '../config/contentful.js';
import { z } from 'zod';
import { getCurrentContext } from '../core/context.js';
import type { McpServerContext } from '../types.js';

export const BaseToolSchema = z.object({
  spaceId: z.string().describe('The ID of the Contentful space'),
  environmentId: z.string().describe('The ID of the Contentful environment'),
});

function resolveContext(contextOverride?: McpServerContext): McpServerContext {
  const context = contextOverride ?? getCurrentContext();
  if (!context) {
    throw new Error(
      'Contentful MCP server context is not available for this tool execution',
    );
  }

  return context;
}

/**
 * Creates a Contentful client with the correct configuration based on resource parameters
 *
 * @param params - Tool parameters that may include a resource
 * @returns Configured Contentful client
 */
export function createToolClient(
  params: z.infer<typeof BaseToolSchema>,
  contextOverride?: McpServerContext,
) {
  const context = resolveContext(contextOverride);
  const clientConfig = getDefaultClientConfig(context);

  if (params.spaceId) {
    clientConfig.space = params.spaceId;
  }

  return ctfl.createClient(clientConfig, { type: 'plain' });
}
