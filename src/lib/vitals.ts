import { onLCP, onCLS, onINP, onTTFB, onFCP } from 'web-vitals';
import { getPostHogClient } from '@/lib/posthog-client';

interface VitalMetric {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
}

function sendToAnalytics(metric: VitalMetric) {
  void getPostHogClient().then((posthog) => {
    posthog?.capture('web_vital', {
      project_id: import.meta.env.PUBLIC_PROJECT_SLUG ?? 'looptv',
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      id: metric.id,
      navigation_type: metric.navigationType,
    });
  });
}

export function initVitals() {
  onLCP(sendToAnalytics);
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onFCP(sendToAnalytics);
}
