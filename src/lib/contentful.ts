import contentfulManagement, {
  ClientOptions,
  ContentfulClientApi,
  Environment,
  PlainClientAPI,
  Space,
} from 'contentful-management';

import { parseTenant, Tenant } from '../schema/tenant.js';
import { getVersion } from '../utils/getVersion.js';
import { withRetry } from '../utils/retry.js';
import {
  ContentfulRequestMeta,
  mapContentfulError,
  mapValidationError,
  ToolError,
} from '../utils/errors.js';
import { createLogger, redactSecret } from '../utils/logger.js';

const logger = createLogger('contentful-client');

export type ContentfulContext = {
  tenant: Tenant;
  client: PlainClientAPI;
  plainClient: PlainClientAPI;
  managementClient: ContentfulClientApi;
  space: Space;
  environment: Environment;
  spaceId: string;
  environmentId: string;
  call<T>(operation: () => Promise<T>, meta?: ContentfulRequestMeta): Promise<T>;
};

export async function createContentfulContext(rawTenant: unknown): Promise<ContentfulContext> {
  let tenant: Tenant;

  try {
    tenant = parseTenant(rawTenant);
  } catch (error) {
    const validationError = mapValidationError(error);
    logger.warn('Invalid tenant credentials received');
    throw validationError;
  }

  logger.debug('Creating Contentful client', {
    spaceId: tenant.spaceId,
    environmentId: tenant.environmentId,
    host: tenant.host,
    token: redactSecret(tenant.accessToken),
  });

  const clientOptions = createClientOptions(tenant);

  const managementClient = contentfulManagement.createClient(clientOptions);
  const plainClient = contentfulManagement.createClient(clientOptions, {
    type: 'plain',
  });

  let space: Space;
  let environment: Environment;

  try {
    space = await withRetry(() => managementClient.getSpace(tenant.spaceId));
  } catch (error) {
    throw mapContentfulError(error, {
      action: 'resolve space for tenant',
      resource: 'space',
      id: tenant.spaceId,
    });
  }

  try {
    environment = await withRetry(() =>
      space.getEnvironment(tenant.environmentId),
    );
  } catch (error) {
    throw mapContentfulError(error, {
      action: 'resolve environment for tenant',
      resource: 'environment',
      id: tenant.environmentId,
    });
  }

  const call = async <T>(
    operation: () => Promise<T>,
    meta?: ContentfulRequestMeta,
  ): Promise<T> => {
    try {
      return await withRetry(operation);
    } catch (error) {
      throw mapContentfulError(error, meta);
    }
  };

  const wrappedClient = wrapPlainClient(plainClient, call);

  return {
    tenant,
    client: wrappedClient,
    plainClient,
    managementClient,
    space,
    environment,
    spaceId: tenant.spaceId,
    environmentId: tenant.environmentId,
    call,
  };
}

function createClientOptions(tenant: Tenant): ClientOptions {
  const headers = {
    'X-Contentful-User-Agent-Tool': `contentful-mcp/${getVersion()}`,
  };

  return {
    accessToken: tenant.accessToken,
    host: tenant.host,
    headers,
    retryLimit: 0,
    logHandler: () => {},
  } satisfies ClientOptions;
}

export async function executeContentfulOperation<T>(
  context: ContentfulContext,
  operation: () => Promise<T>,
  meta?: ContentfulRequestMeta,
): Promise<T> {
  try {
    return await context.call(operation, meta);
  } catch (error) {
    if (error instanceof ToolError) {
      throw error;
    }
    throw mapContentfulError(error, meta);
  }
}

function wrapPlainClient<T extends object>(
  client: T,
  call: ContentfulContext['call'],
  path: string[] = [],
): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      if (typeof prop === 'symbol' || value === undefined) {
        return value;
      }

      if (typeof value === 'function') {
        return (...args: unknown[]) =>
          call(
            () => (value as (...fnArgs: unknown[]) => unknown).apply(target, args),
            {
              action: [...path, String(prop)].join('.'),
            },
          );
      }

      if (value && typeof value === 'object') {
        return wrapPlainClient(value, call, [...path, String(prop)]);
      }

      return value;
    },
  });
}
