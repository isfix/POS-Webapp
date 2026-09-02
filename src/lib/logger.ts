export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  app: string;
  env: string;
  sessionId?: string;
  url?: string;
  context?: Record<string, any>;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
  };
}

const APP_NAME = 'rotikita-pos-webapp';

/**
 * Gets or creates a persistent session ID stored in sessionStorage for the browser lifecycle.
 */
function getSessionId(): string | undefined {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return undefined;
  }
  try {
    let sid = sessionStorage.getItem('rotikita_session_id');
    if (!sid) {
      sid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('rotikita_session_id', sid);
    }
    return sid;
  } catch {
    return undefined;
  }
}

/**
 * Formats structured log entry into a canonical JSON object
 */
export function createStructuredLog(
  level: LogLevel,
  message: string,
  context?: Record<string, any>,
  error?: Error | unknown
): StructuredLog {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
    app: APP_NAME,
    env: process.env.NODE_ENV || 'development',
  };

  const sid = getSessionId();
  if (sid) {
    log.sessionId = sid;
  }

  if (typeof window !== 'undefined' && window.location) {
    log.url = window.location.pathname;
  }

  if (context && Object.keys(context).length > 0) {
    log.context = context;
  }

  if (error) {
    if (error instanceof Error) {
      log.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, any>;
      log.error = {
        name: errObj.name || 'Error',
        message: errObj.message || JSON.stringify(error),
        stack: errObj.stack,
      };
    } else {
      log.error = {
        message: String(error),
      };
    }
  }

  return log;
}

/**
 * Dispatches the log to an optional remote HTTP log aggregator if configured
 */
function dispatchRemoteLog(log: StructuredLog): void {
  const endpoint = process.env.NEXT_PUBLIC_LOG_ENDPOINT;
  if (!endpoint || typeof window === 'undefined') return;

  try {
    if (navigator && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(log)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Fail silently without disrupting UI
  }
}

/**
 * Emits log to console in development with formatted badge, or structured JSON in production
 */
function emitLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error | unknown): void {
  const structured = createStructuredLog(level, message, context, error);

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    const colorMap: Record<LogLevel, string> = {
      debug: '\x1b[36m[DEBUG]\x1b[0m',
      info: '\x1b[32m[INFO]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
    };

    const prefix = colorMap[level] || `[${level.toUpperCase()}]`;
    const consoleMethod = console[level] || console.log;
    
    if (error || context) {
      consoleMethod(`${prefix} ${message}`, context || '', error || '');
    } else {
      consoleMethod(`${prefix} ${message}`);
    }
  } else {
    // Production outputs raw structured JSON
    const consoleMethod = console[level] || console.log;
    consoleMethod(JSON.stringify(structured));
  }

  dispatchRemoteLog(structured);
}

export const logger = {
  debug(message: string, context?: Record<string, any>): void {
    emitLog('debug', message, context);
  },
  info(message: string, context?: Record<string, any>): void {
    emitLog('info', message, context);
  },
  warn(message: string, context?: Record<string, any>, error?: Error | unknown): void {
    emitLog('warn', message, context, error);
  },
  error(message: string, context?: Record<string, any>, error?: Error | unknown): void {
    emitLog('error', message, context, error);
  },
};
