import { describe, it, expect, vi } from 'vitest';
import { mapContentfulError, ContentfulError, withRetry } from './errors.js';

describe('error utilities', () => {
  describe('ContentfulError', () => {
    it('should create error with status code and retryable flag', () => {
      const error = new ContentfulError('Test error', 429, true);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(429);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('ContentfulError');
    });
  });

  describe('mapContentfulError', () => {
    it('should map 400 Bad Request errors', () => {
      const error = { status: 400, message: 'Invalid parameters' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(400);
      expect(mapped.message).toContain('Bad Request');
      expect(mapped.message).toContain('Invalid parameters');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 401 Authentication errors', () => {
      const error = { status: 401, message: 'Invalid token' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(401);
      expect(mapped.message).toContain('Authentication failed');
      expect(mapped.message).toContain('CONTENTFUL_MANAGEMENT_ACCESS_TOKEN');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 403 Permission errors', () => {
      const error = { status: 403, message: 'Forbidden' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(403);
      expect(mapped.message).toContain('Permission denied');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 404 Not Found errors', () => {
      const error = { status: 404, message: 'Entry not found' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(404);
      expect(mapped.message).toContain('Resource not found');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 409 Conflict errors', () => {
      const error = { status: 409, message: 'Version mismatch' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(409);
      expect(mapped.message).toContain('Conflict');
      expect(mapped.message).toContain('modified by another request');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 422 Validation errors', () => {
      const error = { status: 422, message: 'Required field missing' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(422);
      expect(mapped.message).toContain('Validation failed');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should map 429 Rate Limit errors as retryable', () => {
      const error = { status: 429, message: 'Too many requests' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(429);
      expect(mapped.message).toContain('Rate limit exceeded');
      expect(mapped.isRetryable).toBe(true);
    });

    it('should map 500 Server errors as retryable', () => {
      const error = { status: 500, message: 'Internal server error' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(500);
      expect(mapped.message).toContain('Contentful service error');
      expect(mapped.isRetryable).toBe(true);
    });

    it('should map 503 Service Unavailable as retryable', () => {
      const error = { status: 503, message: 'Service unavailable' };
      const mapped = mapContentfulError(error);
      expect(mapped.statusCode).toBe(503);
      expect(mapped.message).toContain('Contentful service error');
      expect(mapped.isRetryable).toBe(true);
    });

    it('should handle JavaScript Error objects', () => {
      const error = new Error('Network failure');
      const mapped = mapContentfulError(error);
      expect(mapped.message).toContain('Unexpected error');
      expect(mapped.message).toContain('Network failure');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should handle unknown error types', () => {
      const error = 'string error';
      const mapped = mapContentfulError(error);
      expect(mapped.message).toContain('Unknown error');
      expect(mapped.message).toContain('string error');
      expect(mapped.isRetryable).toBe(false);
    });

    it('should pass through ContentfulError instances', () => {
      const error = new ContentfulError('Original error', 429, true);
      const mapped = mapContentfulError(error);
      expect(mapped).toBe(error);
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        initialDelayMs: 10,
        maxDelayMs: 20,
      });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(
        withRetry(fn, { initialDelayMs: 10, maxDelayMs: 20 }),
      ).rejects.toThrow('Resource not found');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue({ status: 500, message: 'Server error' });

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 20 }),
      ).rejects.toThrow('Contentful service error');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
        .mockRejectedValueOnce({ status: 503, message: 'Unavailable' })
        .mockResolvedValueOnce('success');

      const start = Date.now();
      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 50,
        maxDelayMs: 200,
        backoffMultiplier: 2,
      });
      const duration = Date.now() - start;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      // Should have waited at least 50ms + 100ms = 150ms (with jitter it could be more)
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should handle successful retry after 5xx error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce({ status: 502, message: 'Bad gateway' })
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        initialDelayMs: 10,
        maxDelayMs: 20,
      });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
