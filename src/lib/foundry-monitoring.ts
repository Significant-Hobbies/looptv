import posthog from 'posthog-js';

const PROJECT_SLUG = 'looptv';
const POSTHOG_KEY = import.meta.env.PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

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
  posthog.capture('foundry_page_crash', {
    project_id: PROJECT_SLUG,
    route: route(),
    source,
    message: messageFrom(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

export function installBrowserMonitoring() {
  if (typeof window === 'undefined') return () => {};
  if (!POSTHOG_KEY) return () => {};
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'always',
    capture_pageview: false,
    autocapture: false,
  });

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
