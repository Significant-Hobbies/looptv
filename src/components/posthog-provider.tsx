'use client';

import { PostHogProvider } from '@saas-maker/posthog-client';
import { useEffect } from 'react';

import { trackReturned, trackSignup } from '@/lib/analytics';
import { installBrowserMonitoring } from '@/lib/foundry-monitoring';
import { getStats } from '@/lib/watched';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return installBrowserMonitoring();
  }, []);

  // Fixed taxonomy: `signup` on the first-ever visit, `returned` on a later
  // session for a device that already has watch history. Both de-dupe
  // internally, so it is safe to call them on every mount.
  useEffect(() => {
    const hasPriorActivity = getStats().totalWatched > 0;
    if (hasPriorActivity) {
      trackReturned(true);
    } else {
      trackSignup();
    }
  }, []);

  return <PostHogProvider>{children}</PostHogProvider>;
}
