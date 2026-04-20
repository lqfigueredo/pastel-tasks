/**
 * Sentry initialization helper.
 * No-op when DSN is missing or in dev — keeps bundle/network noise to zero.
 */
let initialized = false;

export async function initSentry() {
  if (initialized) return;
  if (!import.meta.env.PROD) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        /Network request failed/i,
        /AbortError/i,
        /Load failed/i,
      ],
    });
    initialized = true;
  } catch (err) {
    // Silent — Sentry must never break the app
    console.warn('[sentry] init skipped:', err);
  }
}

export async function setSentryUser(user: { id: string; email?: string | null } | null) {
  if (!import.meta.env.PROD) return;
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/react');
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email ?? undefined });
    } else {
      Sentry.setUser(null);
    }
  } catch {
    /* noop */
  }
}

export async function captureSentryError(error: unknown, context?: Record<string, unknown>) {
  if (!import.meta.env.PROD) {
    console.error('[error]', error, context);
    return;
  }
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* noop */
  }
}
