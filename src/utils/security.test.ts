import { describe, it, expect } from 'vitest';
import { redactToken, scrubSensitiveData } from './security.js';

describe('security utilities', () => {
  describe('redactToken', () => {
    it('should redact tokens showing only last 4 characters', () => {
      const token = 'CFPAT-1234567890abcdef';
      const redacted = redactToken(token);
      expect(redacted).toBe('****cdef');
    });

    it('should handle short tokens', () => {
      const token = 'abc';
      const redacted = redactToken(token);
      expect(redacted).toBe('****');
    });

    it('should handle empty strings', () => {
      const token = '';
      const redacted = redactToken(token);
      expect(redacted).toBe('****');
    });

    it('should show last 4 characters for exact 4-char tokens', () => {
      const token = 'abcd';
      const redacted = redactToken(token);
      expect(redacted).toBe('****');
    });
  });

  describe('scrubSensitiveData', () => {
    it('should redact CONTENTFUL_MANAGEMENT_ACCESS_TOKEN', () => {
      const data = {
        CONTENTFUL_MANAGEMENT_ACCESS_TOKEN: 'CFPAT-1234567890abcdef',
        SPACE_ID: 'space123',
      };

      const scrubbed = scrubSensitiveData(data);
      expect(scrubbed.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN).toBe('****cdef');
      expect(scrubbed.SPACE_ID).toBe('space123');
    });

    it('should redact multiple sensitive fields', () => {
      const data = {
        accessToken: 'token123456',
        password: 'secret123456',
        username: 'john',
      };

      const scrubbed = scrubSensitiveData(data);
      expect(scrubbed.accessToken).toBe('****3456');
      expect(scrubbed.password).toBe('****3456');
      expect(scrubbed.username).toBe('john');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          apiKey: 'key1234567890',
        },
        public: 'data',
      };

      const scrubbed = scrubSensitiveData(data) as typeof data;
      expect(scrubbed.user.name).toBe('John');
      expect(scrubbed.user.apiKey).toBe('****7890');
      expect(scrubbed.public).toBe('data');
    });

    it('should handle various sensitive field name patterns', () => {
      const data = {
        access_token: 'token123456',
        api_key: 'key1234567890',
        secret: 'secret123456',
        token: 'token123456',
      };

      const scrubbed = scrubSensitiveData(data);
      expect(scrubbed.access_token).toBe('****3456');
      expect(scrubbed.api_key).toBe('****7890');
      expect(scrubbed.secret).toBe('****3456');
      expect(scrubbed.token).toBe('****3456');
    });

    it('should preserve non-sensitive data', () => {
      const data = {
        userId: 'user123',
        email: 'test@example.com',
        count: 42,
        active: true,
      };

      const scrubbed = scrubSensitiveData(data);
      expect(scrubbed).toEqual(data);
    });

    it('should handle arrays in objects', () => {
      const data = {
        items: [1, 2, 3],
        token: 'token123456',
      };

      const scrubbed = scrubSensitiveData(data);
      expect(scrubbed.items).toEqual([1, 2, 3]);
      expect(scrubbed.token).toBe('****3456');
    });
  });
});
