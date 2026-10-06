import { describe, expect, it } from 'vitest';
import { buildTaggingEvidenceReport, videosNeedingTags } from '../catalog-tag-status.mjs';
import { runTagging } from '../tagging-runner.mjs';

type TestVideo = {
  id: string;
  title: string;
  duration: number;
  tags: string[];
  source: string;
  description?: string;
  taggingEvidence?: {
    origin: 'model';
    format: 'accepted';
    semanticGrounding: 'unknown';
  };
};

type TestCatalog = { stations: { science: { videos: TestVideo[] } } };

function makeCatalog(ids: string[]): TestCatalog {
  return {
    stations: {
      science: {
        videos: ids.map((id) => ({
          id,
          title: `Video ${id}`,
          duration: 60,
          tags: ['Science Source'],
          source: 'Science Source',
          description: 'Needs a topic tag',
        })),
      },
    },
  };
}

function topicsFor(videos: TestVideo[]): string[][] {
  return videos.map((video) => [`topic ${video.id}`]);
}

const noDelay = async () => {};
const baseOptions = {
  models: ['fake-model'],
  batchSize: 2,
  concurrencyPerModel: 1,
  requestRetries: 0,
  sleepFn: noDelay,
  shuffle: false,
};

describe('production tagging runner with a fake batch provider', () => {
  it('retries a transient quota failure and applies one complete normalized result per ID', async () => {
    const catalog = makeCatalog(['a', 'b']);
    let calls = 0;
    const result = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestRetries: 1,
      requestBatch: async ({ videos }: { videos: TestVideo[] }) => {
        calls += 1;
        if (calls === 1) throw Object.assign(new Error('quota'), { status: 429 });
        return topicsFor(videos);
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ total: 2, tagged: 2, failedIds: [], pendingIds: [] });
    expect(catalog.stations.science.videos).toHaveLength(2);
    expect(catalog.stations.science.videos.map((video) => video.id)).toEqual(['a', 'b']);
    expect(catalog.stations.science.videos.every((video) => !video.description)).toBe(true);
    expect(catalog.stations.science.videos[0].taggingEvidence).toEqual({
      origin: 'model',
      format: 'accepted',
      semanticGrounding: 'unknown',
    });
  });

  it('keeps quota-exhausted IDs pending and reports failure', async () => {
    const catalog = makeCatalog(['a', 'b']);
    let calls = 0;
    const result = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 2,
      requestBatch: async () => {
        calls += 1;
        throw Object.assign(new Error('quota exhausted'), { status: 429 });
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ failedIds: ['a', 'b'], pendingIds: ['a', 'b'] });
    expect(videosNeedingTags(catalog).map(({ video }) => video.id)).toEqual(['a', 'b']);
    expect(catalog.stations.science.videos.every((video) => video.description)).toBe(true);
  });

  it('rejects a short batch atomically and leaves every failed item pending for resume', async () => {
    const catalog = makeCatalog(['a', 'b']);
    const failed = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async () => [['topic a']],
    });

    expect(failed).toMatchObject({
      failedIds: ['a', 'b'],
      pendingIds: ['a', 'b'],
    });
    expect(catalog.stations.science.videos.map((video) => video.tags)).toEqual([
      ['Science Source'],
      ['Science Source'],
    ]);
    expect(catalog.stations.science.videos.every((video) => video.description)).toBe(true);
    expect(catalog.stations.science.videos.every((video) => !video.taggingEvidence)).toBe(true);
    expect(videosNeedingTags(catalog).map(({ video }) => video.id)).toEqual(['a', 'b']);

    const resumed = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async ({ videos }) => topicsFor(videos),
    });
    expect(resumed).toMatchObject({ tagged: 2, failedIds: [], pendingIds: [] });
    expect(catalog.stations.science.videos).toHaveLength(2);
  });

  it('retains successful progress, reports failed IDs, and resumes only those IDs', async () => {
    const catalog = makeCatalog(['a', 'b', 'c', 'd']);
    const first = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async ({ videos }: { videos: TestVideo[] }) => {
        if (videos[0].id === 'c') throw Object.assign(new Error('unavailable'), { status: 503 });
        return topicsFor(videos);
      },
    });

    expect(first).toMatchObject({
      tagged: 2,
      failedIds: ['c', 'd'],
      pendingIds: ['c', 'd'],
    });
    expect(videosNeedingTags(catalog).map(({ video }) => video.id)).toEqual(['c', 'd']);
    expect(catalog.stations.science.videos[0].taggingEvidence.semanticGrounding).toBe('unknown');
    expect(catalog.stations.science.videos[2].description).toBe('Needs a topic tag');

    const resumedIds = [];
    const second = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async ({ videos }) => {
        resumedIds.push(...videos.map((video) => video.id));
        return topicsFor(videos);
      },
    });
    expect(resumedIds).toEqual(['c', 'd']);
    expect(second).toMatchObject({ tagged: 2, failedIds: [], pendingIds: [] });
    expect(catalog.stations.science.videos).toHaveLength(4);
    expect(catalog.stations.science.videos.map((video) => video.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('rejects a malformed later result atomically', async () => {
    const catalog = makeCatalog(['a', 'b']);
    const failed = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async () => [['topic a'], null],
    });

    expect(failed).toMatchObject({ failedIds: ['a', 'b'], pendingIds: ['a', 'b'] });
    expect(catalog.stations.science.videos.map((video) => video.tags)).toEqual([
      ['Science Source'],
      ['Science Source'],
    ]);
    expect(videosNeedingTags(catalog).map(({ video }) => video.id)).toEqual(['a', 'b']);
  });

  it('retains a previously tagged row description when its refresh fails', async () => {
    const catalog = makeCatalog(['old']);
    const video = catalog.stations.science.videos[0];
    video.tags = ['Science Source', 'known topic'];
    video.description = 'Must remain pending until refreshed';

    const failed = await runTagging({
      ...baseOptions,
      catalog,
      maxBatchAttempts: 1,
      requestBatch: async () => {
        throw Object.assign(new Error('provider unavailable'), { status: 503 });
      },
    });

    expect(failed).toMatchObject({ failedIds: ['old'], pendingIds: ['old'] });
    expect(video.tags).toEqual(['Science Source', 'known topic']);
    expect(video.description).toBe('Must remain pending until refreshed');
    expect(videosNeedingTags(catalog).map(({ video: pending }) => pending.id)).toEqual(['old']);
  });

  it('keeps legacy grounding explicitly unknown without calling it verified', () => {
    const catalog = makeCatalog(['legacy']);
    catalog.stations.science.videos[0].tags = ['Science Source', 'old topic'];
    delete catalog.stations.science.videos[0].description;
    const report = buildTaggingEvidenceReport(catalog);

    expect(report.legacyGroundingUnknownVideos).toBe(1);
    expect(report.formatAcceptedModelVideos).toBe(0);
    expect(report.semanticGroundingUnknownVideos).toBe(1);
    expect(report.semanticGroundingVerifiedVideos).toBe(0);
  });
});
