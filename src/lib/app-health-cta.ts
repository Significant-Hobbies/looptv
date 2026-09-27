declare global {
  interface Window {
    appHealth?: {
      track?: (name: string) => void;
    };
  }
}

/** Send a named CTA event when the origin-pinned App Health tracker is ready. */
export function trackCta(name: string): void {
  try {
    if (typeof window !== 'undefined') window.appHealth?.track?.(name);
  } catch {
    // Analytics must not interrupt playback or navigation.
  }
}
