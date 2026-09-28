declare global {
  interface Window {
    appHealth?: {
      track?: (name: string) => void;
      flush?: () => Promise<void>;
    };
  }
}

/** Send a named CTA event when the origin-pinned App Health tracker is ready. */
export function trackCta(name: string): void {
  try {
    if (typeof window === 'undefined') return;
    const appHealth = window.appHealth;
    appHealth?.track?.(name);
    void appHealth?.flush?.().catch(() => undefined);
  } catch {
    // Analytics must not interrupt playback or navigation.
  }
}
