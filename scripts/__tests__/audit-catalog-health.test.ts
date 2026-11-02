import { describe, expect, it } from 'vitest';
import { auditCatalogHealth } from '../audit-catalog-health.mjs';

const stations = [
  {
    id: 'science',
    name: 'Science',
    sources: [
      { name: 'Fresh Source', handle: '@fresh', minDuration: 60, maxDuration: 600 },
      { name: 'Missing Source', handle: '@missing', minDuration: 60, maxDuration: 600 },
    ],
  },
];

describe('catalog health audit', () => {
  it('rejects a missing configured curated selection', () => {
    const result = auditCatalogHealth({
      stations: [
        {
          id: 'hackertube',
          name: 'HackerTube',
          description: 'Selections',
          sources: [],
          curatedVideos: [{ id: 'abcdefghijk', source: 'Speaker' }],
        },
      ],
      catalog: { lastUpdated: '', stations: { hackertube: { videos: [], categoryVideoIds: {} } } },
      requiredFreshCoverage: 0,
    });
    expect(result.violations.join('\n')).toContain('missing curated video abcdefghijk');
  });
  it('audits configured curated IDs separately without inflating channel counts or freshness', () => {
    const curated = {
      id: 'abcdefghijk',
      title: 'A long talk',
      duration: 7200,
      date: '2026-10-01',
      tags: ['Fresh Source', 'Databases'],
      source: 'Fresh Source',
      viewCount: 30_000,
      provenanceUrl: 'https://hackertube.org/p/systems-and-databases',
    };
    const config = [
      { ...stations[0], sources: [stations[0].sources[0]], curatedVideos: [curated] },
    ];
    const catalog = {
      lastUpdated: '2026-07-11T00:00:00.000Z',
      sourceMeta: {
        fresh: {
          fetchedAt: '2026-07-11T00:00:00.000Z',
          lastSuccessfulFetch: '2026-07-11T00:00:00.000Z',
          selectedCount: 1,
          videoCount: 1,
          refreshState: 'live',
        },
      },
      stations: {
        science: {
          videos: [
            {
              id: 'selected',
              title: 'Selected',
              duration: 300,
              source: 'Fresh Source',
              tags: [],
              viewCount: 40_000,
            },
            curated,
          ],
          categoryVideoIds: {},
        },
      },
    };
    const audit = () =>
      auditCatalogHealth({ stations: config, catalog, now: new Date('2026-07-12') });
    const result = audit();
    expect(result.violations).toEqual([]);
    expect(result.summary).toMatchObject({ totalSources: 1, freshSources: 1, selectedVideos: 2 });
    expect(result.stations[0]).toMatchObject({ curatedCount: 1, sources: [{ selectedCount: 1 }] });
    catalog.stations.science.videos[1] = {
      ...curated,
      provenanceUrl: 'https://example.com/unconfigured',
    };
    expect(audit().violations.join('\n')).toContain('unknown source');
    catalog.stations.science.videos[1] = { ...curated, viewCount: 9_999 };
    expect(audit().violations.join('\n')).toContain('10,000');
  });

  it('reports configured zero-result sources and incomplete fresh coverage', () => {
    const result = auditCatalogHealth({
      stations,
      now: new Date('2026-07-12T00:00:00.000Z'),
      catalog: {
        lastUpdated: '2026-07-11T00:00:00.000Z',
        sourceMeta: {
          fresh: {
            fetchedAt: '2026-07-11T00:00:00.000Z',
            lastSuccessfulFetch: '2026-07-11T00:00:00.000Z',
            videoCount: 1,
            refreshState: 'live',
            qualityBaseline: 'full-history',
            fullAuditAt: '2026-07-10T00:00:00.000Z',
            publicUploadCount: 10,
          },
        },
        stations: {
          science: {
            videos: [
              {
                id: 'ok',
                title: 'OK',
                duration: 300,
                source: 'Fresh Source',
                tags: [],
                viewCount: 20_000,
              },
            ],
            categoryVideoIds: {},
          },
        },
      },
    });

    expect(result.summary).toMatchObject({
      totalSources: 2,
      freshSources: 1,
      missingSources: 1,
      selectedVideos: 1,
    });
    expect(result.stations[0].sources[1]).toMatchObject({
      name: 'Missing Source',
      selectedCount: 0,
      health: 'missing',
    });
    expect(result.stations[0].sources[0]).toMatchObject({
      qualityBaseline: 'full-history',
      publicUploadCount: 10,
    });
    expect(
      result.violations.some((message: string) =>
        message.toLowerCase().includes('fresh source coverage')
      )
    ).toBe(true);
  });

  it('detects duration, view-count, and source-membership violations', () => {
    const result = auditCatalogHealth({
      stations: [stations[0]],
      now: new Date('2026-07-12T00:00:00.000Z'),
      catalog: {
        lastUpdated: '2026-07-11T00:00:00.000Z',
        sourceMeta: {},
        stations: {
          science: {
            videos: [
              {
                id: 'bad',
                title: 'Bad',
                duration: 30,
                source: 'Unknown Source',
                tags: [],
                viewCount: 9_999,
              },
            ],
            categoryVideoIds: {},
          },
        },
      },
    });

    expect(result.violations.join('\n')).toContain('Unknown Source');
    expect(result.violations.join('\n')).toContain('10,000');
  });
});
