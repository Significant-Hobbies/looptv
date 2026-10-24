import { expect, test } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

function decodePostHogEvents(request: import('@playwright/test').Request) {
  const body = request.postDataBuffer();
  if (!body) return [];

  let payload: unknown;
  if (body[0] === 0x1f && body[1] === 0x8b) {
    payload = JSON.parse(gunzipSync(body).toString('utf8'));
  } else {
    const text = body.toString('utf8');
    if (text.startsWith('{')) {
      payload = JSON.parse(text);
    } else {
      const encoded = new URLSearchParams(text).get('data');
      if (!encoded) return [];
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      payload = JSON.parse(decoded);
    }
  }

  if (Array.isArray(payload)) return payload;
  if (typeof payload === 'object' && payload !== null && 'batch' in payload) {
    const batch = (payload as { batch?: unknown }).batch;
    return Array.isArray(batch) ? batch : [];
  }
  return [payload];
}

test('counts a video only after its matching player confirms playback', async ({ page }) => {
  const playbackEvents: string[] = [];
  const observedPostHogRequests: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/iframe_api') {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          Player: function (_container, options) {
            const player = this;
            this.videoId = options.videoId;
            this.state = 2;
            this.destroy = () => {};
            this.getPlayerState = () => this.state;
            this.isMuted = () => false;
            this.getVolume = () => 100;
            this.getDuration = () => 100;
            this.getCurrentTime = () => 0;
            this.getVideoData = () => ({ video_id: this.videoId });
            this.loadVideoById = (videoId) => {
              this.videoId = videoId;
              window.__videoLoads = (window.__videoLoads || 0) + 1;
            };
            window.__emitPlayerState = (state) => {
              player.state = state;
              options.events.onStateChange({ data: state, target: player });
            };
            window.__emitPlayerError = (code) => options.events.onError({ data: code, target: player });
            setTimeout(() => options.events.onReady({ target: player }), 0);
          }
        };
        window.onYouTubeIframeAPIReady();`,
      });
    } else if (url.hostname === 'us.i.posthog.com') {
      observedPostHogRequests.push(
        `${route.request().method()} ${url.pathname} ${route.request().headers()['content-type'] ?? ''}`
      );
      if (url.pathname.includes('/e/') && route.request().postData()) {
        for (const event of decodePostHogEvents(route.request()) as Array<{
          event?: string;
          properties?: { action?: string };
        }>) {
          if (event.event === 'activated') playbackEvents.push('activated');
          if (event.event === 'core_action' && event.properties?.action === 'video_played') {
            playbackEvents.push('video_played');
          }
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  await page.goto('/science/');
  await page.getByRole('button', { name: 'Play / Pause (Space)', exact: true }).click();
  await page.waitForFunction(() => '__emitPlayerState' in window);
  expect(playbackEvents).toEqual([]);
  await page.evaluate(() =>
    (window as unknown as { __emitPlayerError: (code: number) => void }).__emitPlayerError(101)
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __videoLoads?: number }).__videoLoads ?? 0)
    )
    .toBeGreaterThan(0);
  expect(playbackEvents).toEqual([]);

  await page.evaluate(() =>
    (window as unknown as { __emitPlayerState: (state: number) => void }).__emitPlayerState(1)
  );
  await expect
    .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
    .toBe(1);
  await expect.poll(() => observedPostHogRequests.length).toBeGreaterThan(0);
  expect(playbackEvents.filter((event) => event === 'activated')).toHaveLength(1);

  await page.evaluate(() => {
    const emit = (window as unknown as { __emitPlayerState: (state: number) => void })
      .__emitPlayerState;
    emit(2);
    emit(1);
  });
  const flushResponse = page.waitForResponse((response) =>
    response.url().includes('us.i.posthog.com/e/')
  );
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await flushResponse;
  await expect
    .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
    .toBe(1);

  const loadsBeforeNext = await page.evaluate(
    () => (window as unknown as { __videoLoads?: number }).__videoLoads ?? 0
  );
  await page.getByRole('button', { name: 'Next (N)', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __videoLoads?: number }).__videoLoads ?? 0)
    )
    .toBeGreaterThan(loadsBeforeNext);
  await expect
    .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
    .toBe(1);

  await page.evaluate(() =>
    (window as unknown as { __emitPlayerState: (state: number) => void }).__emitPlayerState(1)
  );
  await expect
    .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
    .toBe(2);
  expect(playbackEvents.filter((event) => event === 'activated')).toHaveLength(1);
});
