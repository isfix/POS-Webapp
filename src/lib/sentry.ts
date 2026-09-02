import { logger } from './logger';

/**
 * Optional Sentry integration wrapper.
 * When NEXT_PUBLIC_SENTRY_DSN is not configured, operations are safe no-ops.
 * When NEXT_PUBLIC_SENTRY_DSN is configured, dynamically loads @sentry/nextjs if installed.
 */
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function captureError(error: unknown, context?: Record<string, any>): Promise<void> {
  // Always log locally via structured logger
  logger.error(
    error instanceof Error ? error.message : 'Uncaught application error',
    context,
    error
  );

  if (!sentryDsn) {
    return;
  }

  try {
    const pkgName = '@sentry/nextjs';
    // @ts-ignore - optional dynamic package
    const sentry: any = await import(/* webpackIgnore: true */ pkgName).catch(() => null);
    if (sentry && typeof sentry.captureException === 'function') {
      sentry.captureException(error, { extra: context });
    }
  } catch {
    // Fail silently if Sentry package is not present
  }
}

export async function captureMessage(message: string, context?: Record<string, any>): Promise<void> {
  logger.info(message, context);

  if (!sentryDsn) {
    return;
  }

  try {
    const pkgName = '@sentry/nextjs';
    // @ts-ignore - optional dynamic package
    const sentry: any = await import(/* webpackIgnore: true */ pkgName).catch(() => null);
    if (sentry && typeof sentry.captureMessage === 'function') {
      sentry.captureMessage(message, { extra: context });
    }
  } catch {
    // Fail silently
  }
}
