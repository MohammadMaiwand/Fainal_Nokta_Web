type ErrorContext = Record<string, unknown>;

export function reportClientError(error: unknown, context?: ErrorContext) {
  const normalized = error instanceof Error ? error : new Error(String(error));

  if (import.meta.env.DEV) {
    console.error('[monitoring]', normalized, context);
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL;
  if (!endpoint) {
    return;
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: normalized.message,
      stack: normalized.stack,
      context,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }),
    keepalive: true
  }).catch(() => undefined);
}

export function initMonitoring() {
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError(event.reason, { type: 'unhandledrejection' });
  });

  window.addEventListener('error', (event) => {
    reportClientError(event.error ?? event.message, { type: 'window.error' });
  });
}
