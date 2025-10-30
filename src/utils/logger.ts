type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const DEFAULT_LEVEL: LogLevel = 'info';

function getConfiguredLevel(): LogLevel {
  const level = process.env.MCP_LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  return level && LEVELS[level] !== undefined ? level : DEFAULT_LEVEL;
}

const configuredLevel = getConfiguredLevel();

export type Logger = {
  debug: (...values: unknown[]) => void;
  info: (...values: unknown[]) => void;
  warn: (...values: unknown[]) => void;
  error: (...values: unknown[]) => void;
};

export function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  const shouldLog = (level: LogLevel) => {
    return LEVELS[level] >= LEVELS[configuredLevel];
  };

  const makeLogger = (level: LogLevel) =>
    (...values: unknown[]) => {
      if (!shouldLog(level)) {
        return;
      }

      const logFn = level === 'error' ? console.error : console.log;
      logFn(prefix, level.toUpperCase(), ...values);
    };

  return {
    debug: makeLogger('debug'),
    info: makeLogger('info'),
    warn: makeLogger('warn'),
    error: makeLogger('error'),
  };
}

export function redactSecret(secret: string | undefined | null): string {
  if (!secret) {
    return '***';
  }

  const trimmed = secret.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }

  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start}***${end}`;
}
