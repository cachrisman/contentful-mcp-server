/**
 * Security utilities for handling sensitive information in logs and responses.
 */

/**
 * Redacts a sensitive token, showing only the last 4 characters.
 * @param token - The sensitive token to redact
 * @returns Redacted token string (e.g., "****xyz123")
 */
export function redactToken(token: string): string {
  if (!token || token.length <= 4) {
    return '****';
  }
  return `****${token.slice(-4)}`;
}

/**
 * Scrubs sensitive fields from an object for safe logging.
 * @param obj - Object potentially containing sensitive data
 * @returns Scrubbed copy of the object with sensitive fields redacted
 */
export function scrubSensitiveData(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const sensitiveFields = [
    'CONTENTFUL_MANAGEMENT_ACCESS_TOKEN',
    'accessToken',
    'access_token',
    'token',
    'password',
    'secret',
    'apiKey',
    'api_key',
  ];

  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some((field) =>
      lowerKey.includes(field.toLowerCase()),
    );

    if (isSensitive && typeof value === 'string') {
      scrubbed[key] = redactToken(value);
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    ) {
      scrubbed[key] = scrubSensitiveData(value as Record<string, unknown>);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Creates a safe logger that automatically redacts sensitive information.
 * @param enable - Whether logging is enabled
 * @returns Logger object with methods that scrub sensitive data
 */
export function createSafeLogger(
  enable = process.env.NODE_ENV === 'development',
) {
  const noop = () => {};

  if (!enable) {
    return {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    };
  }

  return {
    info: (...args: unknown[]) => {
      const scrubbed = args.map((arg) =>
        typeof arg === 'object' && arg !== null
          ? scrubSensitiveData(arg as Record<string, unknown>)
          : arg,
      );
      console.info(...scrubbed);
    },
    warn: (...args: unknown[]) => {
      const scrubbed = args.map((arg) =>
        typeof arg === 'object' && arg !== null
          ? scrubSensitiveData(arg as Record<string, unknown>)
          : arg,
      );
      console.warn(...scrubbed);
    },
    error: (...args: unknown[]) => {
      const scrubbed = args.map((arg) =>
        typeof arg === 'object' && arg !== null
          ? scrubSensitiveData(arg as Record<string, unknown>)
          : arg,
      );
      console.error(...scrubbed);
    },
    debug: (...args: unknown[]) => {
      const scrubbed = args.map((arg) =>
        typeof arg === 'object' && arg !== null
          ? scrubSensitiveData(arg as Record<string, unknown>)
          : arg,
      );
      console.debug(...scrubbed);
    },
  };
}

export const logger = createSafeLogger();
