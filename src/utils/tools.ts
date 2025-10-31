import ctfl from 'contentful-management';
import type { PlainClientAPI } from 'contentful-management';
import { getDefaultClientConfig } from '../config/contentful.js';
import { z } from 'zod';
import { TenantSchema, type TenantCredentials } from '../schema/tenant.js';
import { createTenantClient } from '../lib/contentful.js';
import { withRetry } from './errors.js';
import { env } from '../config/env.js';

/**
 * Base schema for all tools.
 *
 * MULTI-TENANT MODE (new):
 * - Pass `tenant` object with CONTENTFUL_MANAGEMENT_ACCESS_TOKEN, SPACE_ID, etc.
 *
 * LEGACY MODE (backward compatible):
 * - Pass `spaceId` and `environmentId` directly
 * - Uses environment variables for credentials
 */
export const BaseToolSchema = z.object({
  // Multi-tenant credentials (optional for backward compatibility)
  tenant: TenantSchema.optional().describe(
    'Tenant credentials for multi-tenant operation. Contains CONTENTFUL_MANAGEMENT_ACCESS_TOKEN, SPACE_ID, ENVIRONMENT_ID (default: "master"), and CONTENTFUL_HOST (default: "api.contentful.com"). If not provided, falls back to environment variables.',
  ),
  // Legacy fields for backward compatibility
  spaceId: z.string().describe('The ID of the Contentful space'),
  environmentId: z.string().describe('The ID of the Contentful environment'),
});

/**
 * Creates a Contentful client with the correct configuration.
 * Supports both multi-tenant mode (with tenant object) and legacy mode (with env vars).
 *
 * @param params - Tool parameters that may include tenant credentials
 * @returns Configured Contentful client
 */
export function createToolClient(
  params: z.infer<typeof BaseToolSchema>,
): PlainClientAPI {
  // Multi-tenant mode: Use tenant credentials if provided
  if (params.tenant) {
    // Build tenant from provided credentials
    const tenant: TenantCredentials = {
      CONTENTFUL_MANAGEMENT_ACCESS_TOKEN:
        params.tenant.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      SPACE_ID: params.spaceId || params.tenant.SPACE_ID,
      ENVIRONMENT_ID: params.environmentId || params.tenant.ENVIRONMENT_ID,
      CONTENTFUL_HOST: params.tenant.CONTENTFUL_HOST,
    };

    return createTenantClient(tenant);
  }

  // Legacy mode: Use environment variables
  const clientConfig = getDefaultClientConfig();

  if (params.spaceId) {
    clientConfig.space = params.spaceId;
  }

  return ctfl.createClient(clientConfig, { type: 'plain' });
}

/**
 * Wraps a Contentful API call with retry logic for transient errors.
 * Use this for any Contentful API operations that might fail due to
 * rate limits or temporary service issues.
 *
 * @param fn - The Contentful API function to execute
 * @returns Promise with the result of the API call
 */
export async function withContentfulRetry<T>(fn: () => Promise<T>): Promise<T> {
  return withRetry(fn);
}
