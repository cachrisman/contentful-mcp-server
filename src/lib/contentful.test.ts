import { describe, it, expect, beforeEach } from 'vitest';
import { createTenantClient, clearRequestCache } from './contentful.js';
import type { TenantCredentials } from '../schema/tenant.js';

describe('contentful client factory', () => {
  beforeEach(() => {
    clearRequestCache();
  });

  describe('createTenantClient', () => {
    it('should create a client with tenant credentials', () => {
      const tenant: TenantCredentials = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'test-token-12345',
        SPACE_ID: 'test-space',
        ENVIRONMENT_ID: 'master',
        CONTENTFUL_HOST: 'api.contentful.com',
      };

      const client = createTenantClient(tenant);
      expect(client).toBeDefined();
      // The client should have expected client properties
      expect(client).toHaveProperty('entry');
      expect(client).toHaveProperty('asset');
    });

    it('should create client with custom host', () => {
      const tenant: TenantCredentials = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'test-token-12345',
        SPACE_ID: 'test-space',
        ENVIRONMENT_ID: 'staging',
        CONTENTFUL_HOST: 'preview.contentful.com',
      };

      const client = createTenantClient(tenant);
      expect(client).toBeDefined();
    });

    it('should create different client instances for different tenants', () => {
      const tenant1: TenantCredentials = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'token1',
        SPACE_ID: 'space1',
        ENVIRONMENT_ID: 'master',
        CONTENTFUL_HOST: 'api.contentful.com',
      };

      const tenant2: TenantCredentials = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'token2',
        SPACE_ID: 'space2',
        ENVIRONMENT_ID: 'master',
        CONTENTFUL_HOST: 'api.contentful.com',
      };

      const client1 = createTenantClient(tenant1);
      const client2 = createTenantClient(tenant2);

      // Clients should be different instances
      expect(client1).not.toBe(client2);
    });

    it('should create new instances on each call (stateless)', () => {
      const tenant: TenantCredentials = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'test-token-12345',
        SPACE_ID: 'test-space',
        ENVIRONMENT_ID: 'master',
        CONTENTFUL_HOST: 'api.contentful.com',
      };

      const client1 = createTenantClient(tenant);
      const client2 = createTenantClient(tenant);

      // Even with same credentials, should create new instances
      expect(client1).not.toBe(client2);
    });
  });

  describe('clearRequestCache', () => {
    it('should not throw when called', () => {
      expect(() => clearRequestCache()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      clearRequestCache();
      clearRequestCache();
      expect(() => clearRequestCache()).not.toThrow();
    });
  });
});
