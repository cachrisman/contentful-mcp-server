import { z } from 'zod';

const DEFAULT_ENVIRONMENT_ID = 'master';
const DEFAULT_CONTENTFUL_HOST = 'api.contentful.com';

export const TenantInputSchema = z
  .object({
    CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: z
      .string({
        required_error: 'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is required',
        invalid_type_error:
          'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN must be a string',
      })
      .min(1, 'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN cannot be empty')
      .describe('Contentful Management API access token for the tenant'),
    SPACE_ID: z
      .string({
        required_error: 'SPACE_ID is required',
        invalid_type_error: 'SPACE_ID must be a string',
      })
      .min(1, 'SPACE_ID cannot be empty')
      .describe('Contentful space identifier for the tenant'),
    ENVIRONMENT_ID: z
      .string({ invalid_type_error: 'ENVIRONMENT_ID must be a string' })
      .min(1, 'ENVIRONMENT_ID cannot be empty')
      .optional()
      .default(DEFAULT_ENVIRONMENT_ID)
      .describe('Contentful environment identifier for the tenant'),
    CONTENTFUL_HOST: z
      .string({ invalid_type_error: 'CONTENTFUL_HOST must be a string' })
      .min(1, 'CONTENTFUL_HOST cannot be empty')
      .optional()
      .default(DEFAULT_CONTENTFUL_HOST)
      .describe('Contentful API host for the tenant'),
  })
  .strict();

export type TenantInput = z.infer<typeof TenantInputSchema>;

export const TenantSchema = TenantInputSchema.transform((tenant) => ({
  accessToken: tenant.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
  spaceId: tenant.SPACE_ID,
  environmentId: tenant.ENVIRONMENT_ID ?? DEFAULT_ENVIRONMENT_ID,
  host: normalizeHost(tenant.CONTENTFUL_HOST ?? DEFAULT_CONTENTFUL_HOST),
}));

export type Tenant = z.infer<typeof TenantSchema>;

export function parseTenant(input: unknown): Tenant {
  return TenantSchema.parse(input);
}

function normalizeHost(host: string): string {
  const trimmed = host.trim();
  return trimmed.replace(/^https?:\/\//i, '');
}

export const DEFAULT_TENANT = {
  environmentId: DEFAULT_ENVIRONMENT_ID,
  host: DEFAULT_CONTENTFUL_HOST,
} as const;
