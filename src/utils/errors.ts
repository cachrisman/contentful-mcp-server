/**
 * Error handling utilities for mapping Contentful API errors to MCP errors
 * with actionable messages and retry logic.
 */

import { logger } from './security.js';

export class ContentfulError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable = false,
  ) {
    super(message);
    this.name = 'ContentfulError';
  }
}

/**
 * Maps Contentful API errors to user-friendly error messages.
 * @param error - The error from Contentful API
 * @returns ContentfulError with appropriate message and metadata
 */
export function mapContentfulError(error: unknown): ContentfulError {
  if (error instanceof ContentfulError) {
    return error;
  }

  // Handle Contentful Management API errors or any error with a status field
  if (
    error &&
    typeof error === 'object' &&
    ('sys' in error || 'status' in error)
  ) {
    const cfError = error as {
      sys?: { id?: string; type?: string };
      message?: string;
      status?: number;
      statusText?: string;
    };

    const status = cfError.status || 500;
    const message = cfError.message || cfError.statusText || 'Unknown error';

    switch (status) {
      case 400:
        return new ContentfulError(
          `Bad Request: ${message}. Please check your input parameters.`,
          400,
          false,
        );
      case 401:
        return new ContentfulError(
          `Authentication failed: ${message}. Please verify your CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is valid.`,
          401,
          false,
        );
      case 403:
        return new ContentfulError(
          `Permission denied: ${message}. Your access token does not have sufficient permissions for this operation.`,
          403,
          false,
        );
      case 404:
        return new ContentfulError(
          `Resource not found: ${message}. Please verify the ID and that the resource exists in your space.`,
          404,
          false,
        );
      case 409:
        return new ContentfulError(
          `Conflict: ${message}. The resource may have been modified by another request. Please fetch the latest version and try again.`,
          409,
          false,
        );
      case 422:
        return new ContentfulError(
          `Validation failed: ${message}. Please check that all required fields are provided and correctly formatted.`,
          422,
          false,
        );
      case 429:
        return new ContentfulError(
          `Rate limit exceeded: ${message}. Please wait a moment before retrying.`,
          429,
          true, // Retryable
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new ContentfulError(
          `Contentful service error: ${message}. This is a temporary issue with Contentful's servers.`,
          status,
          true, // Retryable
        );
      default:
        return new ContentfulError(
          `Contentful API error (${status}): ${message}`,
          status,
          status >= 500, // 5xx errors are retryable
        );
    }
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return new ContentfulError(
      `Unexpected error: ${error.message}`,
      undefined,
      false,
    );
  }

  return new ContentfulError(
    `Unknown error: ${String(error)}`,
    undefined,
    false,
  );
}

/**
 * Sleep for a specified duration with jitter for retry backoff.
 * @param ms - Base milliseconds to sleep
 * @param jitterFactor - Jitter factor (0-1) to add randomness
 */
async function sleep(ms: number, jitterFactor = 0.3): Promise<void> {
  const jitter = Math.random() * ms * jitterFactor;
  await new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 1600,
  backoffMultiplier: 2,
};

/**
 * Executes a function with exponential backoff retry logic.
 * Only retries on retryable errors (429, 5xx).
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function
 * @throws ContentfulError if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: ContentfulError | undefined;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const cfError = mapContentfulError(error);
      lastError = cfError;

      // Don't retry if error is not retryable or if we've exhausted attempts
      if (!cfError.isRetryable || attempt === maxAttempts) {
        logger.error('Request failed after retries', {
          attempt,
          maxAttempts,
          statusCode: cfError.statusCode,
          message: cfError.message,
        });
        throw cfError;
      }

      logger.warn('Retrying request after error', {
        attempt,
        maxAttempts,
        statusCode: cfError.statusCode,
        delayMs,
      });

      await sleep(delayMs);
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}
