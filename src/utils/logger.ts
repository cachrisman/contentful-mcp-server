import type { Logger } from '../types.js';

type LoggerLike = Partial<Logger>;

type InternalLogger = {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

function maskString(value: string, secrets: string[]): string {
  let result = value;
  for (const secret of secrets) {
    if (!secret) continue;
    result = result.split(secret).join('[REDACTED]');
  }
  return result;
}

function redactValue(
  value: unknown,
  secrets: string[],
  seen = new WeakSet<object>(),
): unknown {
  if (typeof value === 'string') {
    return maskString(value, secrets);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, secrets, seen));
  }

  if (value && typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[Circular]';
    }
    seen.add(value as object);
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => [key, redactValue(val, secrets, seen)],
    );
    return Object.fromEntries(entries);
  }

  return value;
}

function wrapSink(
  sink: (message: string, meta?: Record<string, unknown>) => void,
  secrets: string[],
): (message: string, meta?: Record<string, unknown>) => void {
  return (message, meta) => {
    const redactedMessage =
      typeof message === 'string' ? maskString(message, secrets) : message;
    const redactedMeta = meta
      ? (redactValue(meta, secrets) as Record<string, unknown>)
      : meta;
    sink(redactedMessage, redactedMeta);
  };
}

function resolveBaseLogger(base?: LoggerLike): InternalLogger {
  return {
    debug: base?.debug ?? (() => undefined),
    info: base?.info ?? ((msg, meta) => console.log(msg, meta ?? '')), // eslint-disable-line no-console
    warn: base?.warn ?? ((msg, meta) => console.warn(msg, meta ?? '')), // eslint-disable-line no-console
    error: base?.error ?? ((msg, meta) => console.error(msg, meta ?? '')), // eslint-disable-line no-console
  };
}

export function createRedactingLogger(
  secrets: Array<string | undefined>,
  baseLogger?: LoggerLike,
): Logger {
  const filteredSecrets = secrets.filter((secret): secret is string =>
    Boolean(secret),
  );
  const effectiveSecrets = filteredSecrets.length ? filteredSecrets : [];
  const base = resolveBaseLogger(baseLogger);

  return {
    debug: wrapSink(base.debug, effectiveSecrets),
    info: wrapSink(base.info, effectiveSecrets),
    warn: wrapSink(base.warn, effectiveSecrets),
    error: wrapSink(base.error, effectiveSecrets),
  };
}
