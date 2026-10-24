import { expect, test } from '@playwright/test';
import { gunzipSync } from 'node:zlib';

function isPostHogEventRequest(rawUrl: string) {
  const url = new URL(rawUrl);
  return url.hostname === 'us.i.posthog.com' && url.pathname.includes('/e/');
}

function decodePostHogEvents(request: import('@playwright/test').Request) {
  const body = request.postDataBuffer();
  if (!body) return [];

  let payload: unknown;
  if (body[0] === 0x1f && body[1] === 0x8b) {
    payload = JSON.parse(gunzipSync(body).toString('utf8'));
  } else {
    const text = body.toString('utf8');
    if (text.startsWith('{') || text.startsWith('[')) {
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
  const observedCatalogRequests: string[] = [];
  const failedScriptRequests: string[] = [];
  const consoleErrors: string[] = [];
  const syntheticCatalog = {
    lastUpdated: '2026-10-24T00:00:00.000Z',
    generatedAt: '2026-10-24T00:00:00.000Z',
    stations: {
      science: {
        videos: [
          { id: 'fixture-video-a', title: 'Fixture A', duration: 60, date: '', tags: [] },
          { id: 'fixture-video-b', title: 'Fixture B', duration: 60, date: '', tags: [] },
          { id: 'fixture-video-c', title: 'Fixture C', duration: 60, date: '', tags: [] },
        ],
        categoryVideoIds: {},
      },
    },
  };
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
            this.playVideo = () => {};
            this.pauseVideo = () => {};
            this.isMuted = () => false;
            this.mute = () => {};
            this.unMute = () => {};
            this.getVolume = () => 100;
            this.setVolume = () => {};
            this.getDuration = () => 100;
            this.getCurrentTime = () => 0;
            this.getVideoData = () => ({ video_id: this.videoId });
            this.loadVideoById = (videoId) => {
              this.videoId = videoId;
              window.__videoLoads = (window.__videoLoads || 0) + 1;
            };
            window.__emitPlayerState = (state) => {
              player.state = state;
              if (state === 1) {
                const fixtureWindow = window as typeof window & { __fixturePlayedIds?: string[] };
                fixtureWindow.__fixturePlayedIds = fixtureWindow.__fixturePlayedIds || [];
                fixtureWindow.__fixturePlayedIds.push(player.getVideoData().video_id);
              }
              options.events.onStateChange({ data: state, target: player });
            };
            window.__emitPlayerError = (code) => options.events.onError({ data: code, target: player });
            setTimeout(() => options.events.onReady({ target: player }), 0);
          }
        };
        window.onYouTubeIframeAPIReady();`,
      });
    } else if (url.pathname === '/catalog.json') {
      observedCatalogRequests.push(`${route.request().method()} ${url.pathname}`);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(syntheticCatalog),
      });
    } else if (url.pathname === '/catalog-summary.json') {
      observedCatalogRequests.push(`${route.request().method()} ${url.pathname}`);
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          lastUpdated: syntheticCatalog.lastUpdated,
          generatedAt: syntheticCatalog.generatedAt,
          stations: { science: { videoCount: syntheticCatalog.stations.science.videos.length } },
          totalVideos: syntheticCatalog.stations.science.videos.length,
        }),
      });
    } else if (url.hostname === 'us.i.posthog.com') {
      const requestSummary = `${route.request().method()} ${url.pathname} ${route.request().headers()['content-type'] ?? ''}`;
      if (isPostHogEventRequest(route.request().url()) && route.request().postData()) {
        try {
          const events = decodePostHogEvents(route.request()) as Array<{
            event?: string;
            properties?: { action?: string };
          }>;
          observedPostHogRequests.push(
            `${requestSummary} events=${events
              .map((event) => `${event.event ?? 'unknown'}:${event.properties?.action ?? ''}`)
              .join(',')}`
          );
          for (const event of events) {
            if (event.event === 'activated') playbackEvents.push('activated');
            if (event.event === 'core_action' && event.properties?.action === 'video_played') {
              playbackEvents.push('video_played');
            }
          }
        } catch (error) {
          observedPostHogRequests.push(
            `${requestSummary} decodeError=${error instanceof Error ? error.message : 'unknown'}`
          );
        }
      } else {
        observedPostHogRequests.push(requestSummary);
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":1}' });
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue();
    } else {
      await route.abort();
    }
  });

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (request.resourceType() === 'script') {
      failedScriptRequests.push(`${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`);
    }
  });
  await page.goto('/science/');
  try {
    await page.waitForFunction(
      () => {
        const play = Array.from(document.querySelectorAll('button')).find(
          (button) => button.textContent?.trim() === 'Play'
        );
        return play instanceof HTMLButtonElement && !play.disabled;
      },
      undefined,
      { timeout: 8000 }
    );
  } catch {
    const state = await page.evaluate(() => ({
      url: location.pathname,
      islands: Array.from(document.querySelectorAll('astro-island')).map((island) => ({
        ssr: island.hasAttribute('ssr'),
        componentUrl: island.getAttribute('component-url'),
        rendererUrl: island.getAttribute('renderer-url'),
      })),
      buttons: Array.from(document.querySelectorAll('button')).map((button) => ({
        label: button.textContent?.trim(),
        disabled: button instanceof HTMLButtonElement ? button.disabled : null,
      })),
    }));
    throw new Error(
      `Playback fixture did not hydrate: ${JSON.stringify({ state, observedCatalogRequests, pageErrors, consoleErrors, failedScriptRequests })}`
    );
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
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
  await expect.poll(() => page.evaluate(() => localStorage.getItem('looptv:activated'))).toBe('1');
  const firstPlaybackFlush = page.waitForResponse(
    (response) => isPostHogEventRequest(response.url()),
    { timeout: 10000 }
  );
  try {
    await firstPlaybackFlush;
  } catch (error) {
    const fixturePlayback = await page.evaluate(() => ({
      activated: localStorage.getItem('looptv:activated'),
      playedIds: (window as typeof window & { __fixturePlayedIds?: string[] }).__fixturePlayedIds,
    }));
    throw new Error(
      `${error instanceof Error ? error.message : 'Playback flush failed'}; fixture playback: ${JSON.stringify(fixturePlayback)}; PostHog requests: ${JSON.stringify(observedPostHogRequests)}`
    );
  }
  try {
    await expect
      .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
      .toBe(1);
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : 'Playback event assertion failed'}; PostHog requests: ${JSON.stringify(observedPostHogRequests)}`
    );
  }
  await expect.poll(() => observedPostHogRequests.length).toBeGreaterThan(0);
  expect(playbackEvents.filter((event) => event === 'activated')).toHaveLength(1);

  await page.evaluate(() => {
    const emit = (window as unknown as { __emitPlayerState: (state: number) => void })
      .__emitPlayerState;
    emit(2);
    emit(1);
  });

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
  const secondPlaybackFlush = page.waitForResponse((response) =>
    isPostHogEventRequest(response.url())
  );
  await secondPlaybackFlush;
  await expect
    .poll(() => playbackEvents.filter((event) => event === 'video_played').length)
    .toBe(2);
  expect(playbackEvents.filter((event) => event === 'activated')).toHaveLength(1);
});
