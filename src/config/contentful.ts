import { ClientOptions } from 'contentful-management';
import { getVersion } from '../utils/getVersion.js';
import { getCurrentContext } from '../core/context.js';
import type { McpServerContext } from '../types.js';

/**
 * Creates a default Contentful client configuration without actually initializing it.
 */
export function getDefaultClientConfig(
  contextOverride?: McpServerContext,
): ClientOptions {
  const context = contextOverride ?? getCurrentContext();

  if (!context) {
    throw new Error('Contentful MCP server context is not available');
  }

  return {
    accessToken: context.accessToken,
    host: context.host,
    space: context.spaceId,
    headers: {
      'X-Contentful-User-Agent-Tool': `contentful-mcp/${getVersion()}`,
    },
  } satisfies ClientOptions;
}
