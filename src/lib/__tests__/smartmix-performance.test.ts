import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { expect, test } from 'vitest';

import { createSmartMixProfile, pickSmartMixVideo } from '../smartmix';
import type { Catalog, Video } from '../types';

const SIZES = [1_000, 5_000, 8_760];
const ITERATIONS = 25;
const EXPECTED_HASHES = new Map([
  [1_000, '2a044d45a969d2e3081a5bef75c1e06e2beb2591e042396c22379b67be17dfc0'],
  [5_000, '82cd71d7849a607ee530da23a7cd18103c0dc81329f60f688d2d27b5ec6a9ecc'],
  [8_760, '42c346ed2bee44dac7abf332105d2e417cd4a3fa7feaa814390c75356337f552'],
]);

test('Smart Mix ranks the supported catalog size', { timeout: 30_000 }, () => {
  const metrics: string[] = [];
  const originalRandom = Math.random;
  Math.random = () => 0.25;

  try {
    for (const size of SIZES) {
      const catalog = buildCatalog(size);
      const profile = createSmartMixProfile({
        favorites: Array.from(
          { length: Math.ceil(size / 20) },
          (_, index) => `video-${index * 20}`
        ),
        sourceWeights: Object.fromEntries(
          Array.from({ length: 60 }, (_, index) => [`Source ${index}`, (index % 5) - 2])
        ),
        tagWeights: Object.fromEntries(
          Array.from({ length: 40 }, (_, index) => [`tag-${index}`, (index % 7) - 3])
        ),
      });
      const expected = JSON.stringify(pickSmartMixVideo(catalog, profile));
      const expectedHash = createHash('sha256').update(expected).digest('hex');
      expect(expectedHash).toBe(EXPECTED_HASHES.get(size));
      let durationMs = 0;

      for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
        const startedAt = performance.now();
        const result = pickSmartMixVideo(catalog, profile);
        durationMs += performance.now() - startedAt;
        expect(JSON.stringify(result)).toBe(expected);
        expect(createHash('sha256').update(JSON.stringify(result)).digest('hex')).toBe(
          expectedHash
        );
      }

      metrics.push(`size${size}=${(durationMs / ITERATIONS).toFixed(3)}ms/op`);
    }
  } finally {
    Math.random = originalRandom;
  }

  console.log(`[benchmark] ${metrics.join(' ')} (${ITERATIONS} iterations)`);
  console.log(`[resource] supported_catalog_videos=${SIZES.at(-1)}`);
});

function buildCatalog(size: number): Catalog {
  const videos: Video[] = Array.from({ length: size }, (_, index) => ({
    id: `video-${index}`,
    title: `Video ${index}`,
    duration: 120 + (index % 1_200),
    date: '2026-08-01',
    tags: [`tag-${index % 40}`, `tag-${(index + 7) % 40}`, `tag-${(index + 19) % 40}`],
    source: `Source ${index % 60}`,
    viewCount: 10_000 + ((index * 104_729) % 10_000_000),
  }));

  return {
    lastUpdated: '2026-08-01',
    stations: {
      all: { videos, categoryVideoIds: {} },
    },
  };
}
