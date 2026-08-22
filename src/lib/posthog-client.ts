/**
 * Shared, lazily-loaded posthog-js client.
 *
 * posthog-js is ~220 KB and is NOT on the LCP-critical path, so it is imported
 * dynamically (not at module top-level). The first call kicks off the dynamic
 * import AND `posthog.init()`; subsequent callers await the same promise and
 * get an already-initialized client. This keeps the analytics chunk out of the
 * eager `client:only` main bundle so it never blocks initial render.
 *
 * Browser-only: LoopTV is a static export with no server runtime.
 */
import type posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.PUBLIC_POSTHOG_KEY?.trim();
const POSTHOG_HOST = import.meta.env.PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

type PostHogClient = typeof posthog;

let clientPromise: Promise<PostHogClient | null> | null = null;

/**
 * Returns the initialized posthog client, or `null` when there is no key
 * (analytics disabled) or when not in a browser. Resolves the same shared
 * promise on every call so init runs exactly once.
 */
export function getPostHogClient(): Promise<PostHogClient | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!POSTHOG_KEY) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('posthog-js')
      .then((m) => {
        const ph = m.default;
        ph.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          person_profiles: 'always',
          capture_pageview: false,
          autocapture: false,
        });
        return ph;
      })
      .catch(() => null);
  }
  return clientPromise;
}
