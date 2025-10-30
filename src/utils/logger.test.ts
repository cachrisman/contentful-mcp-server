import { describe, expect, it, vi } from 'vitest';
import { createRedactingLogger } from './logger.js';

describe('createRedactingLogger', () => {
  it('redacts secrets from message and metadata', () => {
    const info = vi.fn();
    const logger = createRedactingLogger(['super-secret'], { info });

    logger.info('Token: super-secret', {
      nested: {
        token: 'super-secret',
      },
    });

    expect(info).toHaveBeenCalledTimes(1);
    const [message, meta] = info.mock.calls[0];
    expect(message).toBe('Token: [REDACTED]');
    expect(meta).toEqual({ nested: { token: '[REDACTED]' } });
  });

  it('falls back to console when logger methods are missing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const logger = createRedactingLogger(['secret']);

    logger.info('contains secret');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [message] = logSpy.mock.calls[0];
    expect(message).toBe('contains [REDACTED]');

    logSpy.mockRestore();
  });
});
