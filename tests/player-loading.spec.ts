import { expect, test } from '@playwright/test';

test('Next during iframe startup loads the latest selection when ready', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/iframe_api') {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `window.__loads = [];
          window.YT = {
            PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
            Player: function (container, options) {
              this.destroy = () => {};
              this.getPlayerState = () => 1;
              this.isMuted = () => false;
              this.getVolume = () => 100;
              this.getDuration = () => 100;
              this.getCurrentTime = () => 0;
              window.__initialVideo = options.videoId;
              window.__finishPlayer = () => {
                this.loadVideoById = (id) => window.__loads.push(id);
                options.events.onReady({ target: this });
              };
            }
          };
          window.onYouTubeIframeAPIReady();`,
      });
    } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      await route.continue();
    } else {
      await route.abort();
    }
  });
  await page.goto('/science/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => '__finishPlayer' in window);
  const title = page.locator('p.truncate.text-sm.font-medium');
  const initialTitle = await title.textContent();
  await page.getByRole('button', { name: 'Next (N)', exact: true }).click();
  await expect(title).not.toHaveText(initialTitle ?? '');
  await page.evaluate(() => (window as unknown as { __finishPlayer: () => void }).__finishPlayer());
  const loaded = await page.evaluate(() => (window as unknown as { __loads: string[] }).__loads);
  expect(loaded).toHaveLength(1);
  const catalog = await page.request.get('/catalog.json').then((response) => response.json());
  const video = catalog.stations.science.videos.find(
    (item: { id: string }) => item.id === loaded[0]
  );
  await expect(title).toHaveText(video.title);
  await page.getByRole('button', { name: 'Next (N)', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __loads: string[] }).__loads.length))
    .toBe(2);
  await expect(page.locator('script[src*="project-strip.js"]')).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('script[src*="project-strip.js"]')).toHaveCount(0);
  await expect(
    page.locator('footer[data-fleet-footer="studio"][data-catalog-id="looptv"]')
  ).toHaveCount(1);
});
