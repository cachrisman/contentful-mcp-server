// Common types and utilities for Contentful bulk operations
import type { ContentfulContext } from '../lib/contentful.js';
import { executeContentfulOperation } from '../lib/contentful.js';

export interface VersionedLink {
  sys: {
    type: 'Link';
    linkType: 'Entry' | 'Asset';
    id: string;
    version: number;
  };
}

export interface UnversionedLink {
  sys: {
    type: 'Link';
    linkType: 'Entry' | 'Asset';
    id: string;
  };
}

export interface Collection<T> {
  sys: {
    type: 'Array';
  };
  items: T[];
}

export interface BulkActionResponse {
  sys: {
    id: string;
    status: string;
  };
  succeeded?: Array<{
    sys: {
      id: string;
      type: string;
    };
  }>;
  failed?: Array<{
    sys: {
      id: string;
      type: string;
    };
    error?: unknown;
  }>;
  error?: unknown;
}

export interface BulkOperationParams {
  spaceId: string;
  environmentId: string;
}

// Helper function to wait for bulk action completion
export async function waitForBulkActionCompletion(
  context: ContentfulContext,
  baseParams: BulkOperationParams,
  bulkActionId: string,
): Promise<BulkActionResponse> {
  let action = (await executeContentfulOperation(
    context,
    () =>
      context.client.bulkAction.get({
        ...baseParams,
        bulkActionId,
      }),
    {
      action: 'check bulk action status',
      resource: 'bulkAction',
      id: bulkActionId,
    },
  )) as unknown as BulkActionResponse;

  while (
    action.sys.status === 'inProgress' ||
    action.sys.status === 'created'
  ) {
    await sleep(1000);
    action = (await executeContentfulOperation(
      context,
      () =>
        context.client.bulkAction.get({
          ...baseParams,
          bulkActionId,
        }),
      {
        action: 'check bulk action status',
        resource: 'bulkAction',
        id: bulkActionId,
      },
    )) as unknown as BulkActionResponse;
  }

  return action;
}

// Helper function to create versioned links for entries
export async function createEntryVersionedLinks(
  context: ContentfulContext,
  baseParams: BulkOperationParams,
  entryIds: string[],
): Promise<VersionedLink[]> {
  return Promise.all(
    entryIds.map(async (entryId) => {
      const currentEntry = await executeContentfulOperation(
        context,
        () =>
          context.client.entry.get({
            ...baseParams,
            entryId,
          }),
        {
          action: 'fetch entry for bulk publish',
          resource: 'entry',
          id: entryId,
        },
      );

      return {
        sys: {
          type: 'Link' as const,
          linkType: 'Entry' as const,
          id: entryId,
          version: currentEntry.sys.version,
        },
      };
    }),
  );
}

// Helper function to create unversioned links for entries (used for unpublish operations)
export async function createEntryUnversionedLinks(
  context: ContentfulContext,
  baseParams: BulkOperationParams,
  entryIds: string[],
): Promise<UnversionedLink[]> {
  // For unpublish operations, we don't need to fetch entries since we only need IDs
  // But we should validate they exist first
  await Promise.all(
    entryIds.map(async (entryId) => {
      await executeContentfulOperation(
        context,
        () =>
          context.client.entry.get({
            ...baseParams,
            entryId,
          }),
        {
          action: 'validate entry for bulk unpublish',
          resource: 'entry',
          id: entryId,
        },
      );
    }),
  );

  return entryIds.map((entryId) => ({
    sys: {
      type: 'Link' as const,
      linkType: 'Entry' as const,
      id: entryId,
    },
  }));
}

// Helper function to create versioned links for assets
export async function createAssetVersionedLinks(
  context: ContentfulContext,
  baseParams: BulkOperationParams,
  assetIds: string[],
): Promise<VersionedLink[]> {
  return Promise.all(
    assetIds.map(async (assetId) => {
      const currentAsset = await executeContentfulOperation(
        context,
        () =>
          context.client.asset.get({
            ...baseParams,
            assetId,
          }),
        {
          action: 'fetch asset for bulk publish',
          resource: 'asset',
          id: assetId,
        },
      );

      return {
        sys: {
          type: 'Link' as const,
          linkType: 'Asset' as const,
          id: assetId,
          version: currentAsset.sys.version,
        },
      };
    }),
  );
}

// Helper function to create unversioned links for assets (used for unpublish operations)
export async function createAssetUnversionedLinks(
  context: ContentfulContext,
  baseParams: BulkOperationParams,
  assetIds: string[],
): Promise<UnversionedLink[]> {
  // For unpublish operations, we don't need to fetch assets since we only need IDs
  // But we should validate they exist first
  await Promise.all(
    assetIds.map(async (assetId) => {
      await executeContentfulOperation(
        context,
        () =>
          context.client.asset.get({
            ...baseParams,
            assetId,
          }),
        {
          action: 'validate asset for bulk unpublish',
          resource: 'asset',
          id: assetId,
        },
      );
    }),
  );

  return assetIds.map((assetId) => ({
    sys: {
      type: 'Link' as const,
      linkType: 'Asset' as const,
      id: assetId,
    },
  }));
}

// Helper function to create collection from versioned links
export function createEntitiesCollection(
  entities: VersionedLink[],
): Collection<VersionedLink>;
export function createEntitiesCollection(
  entities: UnversionedLink[],
): Collection<UnversionedLink>;
export function createEntitiesCollection(
  entities: VersionedLink[] | UnversionedLink[],
): Collection<VersionedLink | UnversionedLink> {
  return {
    sys: {
      type: 'Array',
    },
    items: entities,
  };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
