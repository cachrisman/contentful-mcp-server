import { isRetryableStatus, isRateLimitError } from './errors.js';

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
};

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 1600;
const DEFAULT_JITTER_RATIO = 0.2;

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    jitterRatio = DEFAULT_JITTER_RATIO,
  } = options;

  let attempt = 0;
  let delay = baseDelayMs;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;

      const retryable = isRetryableStatus(error) || isRateLimitError(error);
      const hasAttemptsRemaining = attempt < maxAttempts;

      if (!retryable || !hasAttemptsRemaining) {
        throw error;
      }

      const jitter = delay * jitterRatio;
      const minDelay = Math.max(0, delay - jitter);
      const maxDelay = delay + jitter;
      const sleepFor = Math.random() * (maxDelay - minDelay) + minDelay;

      await sleep(sleepFor);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
