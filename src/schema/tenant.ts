import { z } from 'zod';

/**
 * Schema for tenant credentials passed with every tool call.
 * This enables multi-tenant, stateless operation.
 */
export const TenantSchema = z.object({
  CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: z
    .string()
    .min(10, 'Management access token must be at least 10 characters')
    .describe('Contentful Management API access token (required)'),
  SPACE_ID: z
    .string()
    .min(1, 'Space ID is required')
    .describe('Contentful Space ID (required)'),
  ENVIRONMENT_ID: z
    .string()
    .min(1)
    .default('master')
    .describe('Contentful Environment ID (defaults to "master")'),
  CONTENTFUL_HOST: z
    .string()
    .default('api.contentful.com')
    .describe('Contentful API host (defaults to "api.contentful.com")'),
});

export type TenantCredentials = z.infer<typeof TenantSchema>;

/**
 * Validates tenant credentials and throws a descriptive error if invalid.
 * @param tenant - The tenant object to validate
 * @returns Validated and normalized tenant credentials
 * @throws Error with detailed validation messages if invalid
 */
export function validateTenantCredentials(tenant: unknown): TenantCredentials {
  try {
    return TenantSchema.parse(tenant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('; ');
      throw new Error(`Invalid tenant credentials: ${messages}`);
    }
    throw error;
  }
}

/**
 * Safely parses tenant credentials without throwing.
 * @param tenant - The tenant object to validate
 * @returns Parse result with success/error information
 */
export function safeParseTenantCredentials(tenant: unknown) {
  return TenantSchema.safeParse(tenant);
}
