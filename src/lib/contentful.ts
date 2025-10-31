import ctfl from 'contentful-management';
import type { PlainClientAPI } from 'contentful-management';
import type { TenantCredentials } from '../schema/tenant.js';
import { getVersion } from '../utils/getVersion.js';

/**
 * Creates a fresh Contentful Management client for a specific tenant.
 * This function should be called on EVERY tool invocation to ensure
 * proper multi-tenant isolation and stateless operation.
 *
 * @param tenant - Validated tenant credentials
 * @returns A plain Contentful Management client configured for the tenant
 */
export function createTenantClient(tenant: TenantCredentials): PlainClientAPI {
  const client = ctfl.createClient(
    {
      accessToken: tenant.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      host: tenant.CONTENTFUL_HOST,
      space: tenant.SPACE_ID,
      headers: {
        'X-Contentful-User-Agent-Tool': `contentful-mcp/${getVersion()}`,
      },
      // Optional: Add timeout configuration
      // timeout: 30000, // 30 seconds
    },
    { type: 'plain' },
  );

  return client;
}

/**
 * Clears the request-scoped cache (placeholder for future caching implementation).
 * This is provided for API consistency.
 */
export function clearRequestCache(): void {
  // Placeholder - no caching currently implemented to ensure stateless operation
}
