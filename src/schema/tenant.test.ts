import { describe, it, expect } from 'vitest';
import {
  TenantSchema,
  validateTenantCredentials,
  safeParseTenantCredentials,
} from './tenant.js';

describe('TenantSchema', () => {
  describe('validation', () => {
    it('should validate correct tenant credentials', () => {
      const validTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
        ENVIRONMENT_ID: 'master',
        CONTENTFUL_HOST: 'api.contentful.com',
      };

      const result = TenantSchema.safeParse(validTenant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validTenant);
      }
    });

    it('should apply default values for optional fields', () => {
      const minimalTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
      };

      const result = TenantSchema.safeParse(minimalTenant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ENVIRONMENT_ID).toBe('master');
        expect(result.data.CONTENTFUL_HOST).toBe('api.contentful.com');
      }
    });

    it('should fail validation when CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is missing', () => {
      const invalidTenant = {
        SPACE_ID: 'space123',
      };

      const result = TenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain(
          'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN',
        );
      }
    });

    it('should fail validation when CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is too short', () => {
      const invalidTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'short',
        SPACE_ID: 'space123',
      };

      const result = TenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'at least 10 characters',
        );
      }
    });

    it('should fail validation when SPACE_ID is missing', () => {
      const invalidTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
      };

      const result = TenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('SPACE_ID');
      }
    });

    it('should fail validation when SPACE_ID is empty', () => {
      const invalidTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: '',
      };

      const result = TenantSchema.safeParse(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain('SPACE_ID');
      }
    });

    it('should allow custom ENVIRONMENT_ID', () => {
      const customTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
        ENVIRONMENT_ID: 'staging',
      };

      const result = TenantSchema.safeParse(customTenant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ENVIRONMENT_ID).toBe('staging');
      }
    });

    it('should allow custom CONTENTFUL_HOST', () => {
      const customTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
        CONTENTFUL_HOST: 'preview.contentful.com',
      };

      const result = TenantSchema.safeParse(customTenant);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.CONTENTFUL_HOST).toBe('preview.contentful.com');
      }
    });
  });

  describe('validateTenantCredentials', () => {
    it('should return validated credentials for valid input', () => {
      const validTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
      };

      const result = validateTenantCredentials(validTenant);
      expect(result.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN).toBe(
        'valid-token-12345',
      );
      expect(result.SPACE_ID).toBe('space123');
      expect(result.ENVIRONMENT_ID).toBe('master');
      expect(result.CONTENTFUL_HOST).toBe('api.contentful.com');
    });

    it('should throw descriptive error for invalid credentials', () => {
      const invalidTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'short',
        SPACE_ID: '',
      };

      expect(() => validateTenantCredentials(invalidTenant)).toThrow(
        'Invalid tenant credentials',
      );
      expect(() => validateTenantCredentials(invalidTenant)).toThrow(
        'at least 10 characters',
      );
    });

    it('should throw error for missing required fields', () => {
      const invalidTenant = {
        SPACE_ID: 'space123',
      };

      expect(() => validateTenantCredentials(invalidTenant)).toThrow(
        'Invalid tenant credentials',
      );
    });
  });

  describe('safeParseTenantCredentials', () => {
    it('should return success for valid credentials', () => {
      const validTenant = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'valid-token-12345',
        SPACE_ID: 'space123',
      };

      const result = safeParseTenantCredentials(validTenant);
      expect(result.success).toBe(true);
    });

    it('should return error for invalid credentials without throwing', () => {
      const invalidTenant = {
        SPACE_ID: 'space123',
      };

      const result = safeParseTenantCredentials(invalidTenant);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
