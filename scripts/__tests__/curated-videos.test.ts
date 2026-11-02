import { describe, expect, it } from 'vitest';
import { mergeCuratedVideos } from '../curated-videos.mjs';
import type { Catalog, CuratedVideo, StationConfig } from '../../src/lib/types';

const video: CuratedVideo = {
  id: 'abcdefghijk',
  title: 'A curated talk',
  duration: 7200,
  date: '2026-10-01',
  tags: ['Speaker', 'Databases'],
  source: 'Speaker',
  viewCount: 50_000,
  provenanceUrl: 'https://hackertube.org/p/systems-and-databases',
};
const stations: StationConfig[] = [
  {
    id: 'tech',
    name: 'Tech',
    description: 'Technology',
    sources: [],
    curatedVideos: [video],
  },
];

describe('curated video merge', () => {
  it('adds tagged videos without changing source freshness and is repeatable', () => {
    const catalog: Catalog = {
      lastUpdated: '2026-10-01T00:00:00Z',
      sourceMeta: { speaker: { fetchedAt: '', lastSuccessfulFetch: '', videoCount: 0 } },
      stations: { tech: { videos: [], categoryVideoIds: {} } },
    };
    const first = mergeCuratedVideos(catalog, stations);
    expect(first).toMatchObject({ added: 1, existing: 0 });
    expect(first.catalog.stations.tech.videos).toEqual([video]);
    expect(first.catalog.lastUpdated).toBe(catalog.lastUpdated);
    expect(first.catalog.sourceMeta).toEqual(catalog.sourceMeta);
    expect(catalog.stations.tech.videos).toEqual([]);
    const second = mergeCuratedVideos(first.catalog, stations);
    expect(second).toMatchObject({ added: 0, existing: 1 });
    expect(second.catalog).toEqual(first.catalog);
  });

  it('moves existing videos to their curated station while preserving tags and truthful channel counts', () => {
    const selected = {
      ...video,
      duration: 1200,
      source: 'Existing Channel',
      tags: ['Original', 'Tag'],
    };
    Reflect.deleteProperty(selected, 'provenanceUrl');
    const catalog: Catalog = {
      lastUpdated: '',
      sourceMeta: {
        existing: {
          fetchedAt: 'old',
          lastSuccessfulFetch: 'old',
          videoCount: 12,
          selectedCount: 1,
        },
      },
      stations: {
        science: { videos: [selected], categoryVideoIds: { topic: [video.id] } },
        tech: { videos: [], categoryVideoIds: {} },
      },
    };
    const result = mergeCuratedVideos(catalog, [
      ...stations,
      {
        id: 'science',
        name: 'Science',
        description: 'Science',
        sources: [{ name: 'Existing Channel', handle: '@existing' }],
      },
    ]);
    expect(result.added).toBe(0);
    expect(result.catalog.stations.science.videos).toHaveLength(0);
    expect(result.catalog.stations.science.categoryVideoIds.topic).toEqual([]);
    expect(result.catalog.stations.tech.videos[0]).toMatchObject({
      source: 'Speaker',
      duration: 7200,
      provenanceUrl: video.provenanceUrl,
      tags: ['Original', 'Tag', 'Speaker', 'Databases'],
    });
    expect(result.catalog.sourceMeta?.existing).toEqual({
      ...catalog.sourceMeta?.existing,
      selectedCount: 0,
    });
    expect(catalog.stations.science.videos[0].tags).toEqual(['Original', 'Tag']);
  });

  it('rejects ineligible metadata before changing the catalog', () => {
    const catalog: Catalog = {
      lastUpdated: '',
      stations: { tech: { videos: [], categoryVideoIds: {} } },
    };
    const invalid = [{ ...stations[0], curatedVideos: [{ ...video, viewCount: 9_999 }] }];
    expect(() => mergeCuratedVideos(catalog, invalid)).toThrow('10000');
    expect(catalog.stations.tech.videos).toEqual([]);
  });
});
