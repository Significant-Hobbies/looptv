import { describe, expect, it } from 'vitest';
import {
  catalogFallbackRows,
  computeEnrichBudget,
  filterFlatByDuration,
  findSourceByHandle,
  isBotDetectionError,
  ytDlpBaseArgs,
  ytDlpTimeoutMs,
} from '../fetch-channel.mjs';

const catalog = {
  stations: {
    science: {
      videos: [
        {
          id: 'known',
          title: 'Known video',
          duration: 300,
          source: 'Known Source',
          viewCount: 42_000,
        },
        {
          id: 'other',
          title: 'Other video',
          duration: 400,
          source: 'Other Source',
          viewCount: 50_000,
        },
      ],
    },
  },
};

describe('fetch-channel', () => {
  it('filters flat entries by per-source duration', () => {
    const flat = [
      { id: 'a', duration: 30 },
      { id: 'b', duration: 300 },
      { id: 'c', duration: 5000 },
    ];
    expect(filterFlatByDuration(flat, 60, 1800).map((v) => v.id)).toEqual(['b']);
  });

  it('enriches all rows for small channels', () => {
    expect(computeEnrichBudget(80, {})).toBe(80);
  });

  it('caps enrich budget for mega channels', () => {
    const snl = findSourceByHandle('@SaturdayNightLive');
    const budget = computeEnrichBudget(9000, snl);
    expect(budget).toBeGreaterThanOrEqual(250);
    expect(budget).toBeLessThan(9000);
    expect(budget).toBeLessThanOrEqual(500);
  });

  it('detects YouTube bot wall errors', () => {
    expect(isBotDetectionError("Sign in to confirm you're not a bot")).toBe(true);
    expect(isBotDetectionError('network timeout')).toBe(false);
  });

  it('uses android/web player client for CI resilience', () => {
    expect(ytDlpBaseArgs()).toContain('youtube:player_client=android,web');
  });

  it('bounds yt-dlp only when a positive timeout is configured', () => {
    expect(ytDlpTimeoutMs({})).toBeUndefined();
    expect(ytDlpTimeoutMs({ YT_DLP_TIMEOUT_MS: '600000' })).toBe(600000);
    expect(ytDlpTimeoutMs({ YT_DLP_TIMEOUT_MS: 'invalid' })).toBeUndefined();
  });

  it('converts the checked-in catalog into source fallback rows', () => {
    expect(catalogFallbackRows(catalog, { stationId: 'science', name: 'Known Source' })).toEqual([
      {
        id: 'known',
        title: 'Known video',
        duration: 300,
        view_count: 42_000,
        description: '',
        _looptvCatalogFallback: true,
      },
    ]);
  });
});
