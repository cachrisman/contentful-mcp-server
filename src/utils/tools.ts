import { z } from 'zod';
import { createContentfulContext, ContentfulContext } from '../lib/contentful.js';
import { TenantInputSchema } from '../schema/tenant.js';

export const BaseToolSchema = z.object({
  tenant: TenantInputSchema.describe(
    'Per-request Contentful credentials and target identifiers',
  ),
});

export type BaseToolParams = z.infer<typeof BaseToolSchema>;

export async function createToolClient(
  params: BaseToolParams,
): Promise<ContentfulContext> {
  return createContentfulContext(params.tenant);
}

export { executeContentfulOperation } from '../lib/contentful.js';
