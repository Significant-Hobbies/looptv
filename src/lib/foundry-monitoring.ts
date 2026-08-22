import { getPostHogClient } from '@/lib/posthog-client';

const PROJECT_SLUG = 'looptv';

function route() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}

function messageFrom(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

function capturePageCrash(error: unknown, source: 'window_error' | 'unhandled_rejection') {
  // Fire-and-forget: monitoring must never block or break a user flow.
  void getPostHogClient().then((ph) => {
    if (!ph) return;
    try {
      ph.capture('foundry_page_crash', {
        project_id: PROJECT_SLUG,
        route: route(),
        source,
        message: messageFrom(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } catch {
      // Swallow — monitoring must never throw.
    }
  });
}

/**
 * Installs window-level error/unhandledrejection listeners that route crashes
 * to PostHog. Also kicks off the lazy posthog-js init (via getPostHogClient)
 * so the heavy analytics chunk loads after the page is interactive rather
 * than blocking initial render.
 */
export function installBrowserMonitoring() {
  if (typeof window === 'undefined') return () => {};
  // Trigger the lazy init (no-op when no key is configured).
  void getPostHogClient();

  const onError = (event: ErrorEvent) =>
    capturePageCrash(event.error ?? event.message, 'window_error');
  const onUnhandledRejection = (event: PromiseRejectionEvent) =>
    capturePageCrash(event.reason, 'unhandled_rejection');

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
