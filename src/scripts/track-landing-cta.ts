import { trackCta } from '../components/trackCta';

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const cta = event.target.closest<HTMLElement>('[data-app-health-event]');
  const name = cta?.dataset.appHealthEvent;
  if (name) queueMicrotask(() => trackCta(name));
});
