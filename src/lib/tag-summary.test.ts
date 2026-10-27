import { describe, expect, it } from 'vitest';
import type { Catalog } from './types';
import { tagSummaries } from './tag-summary';

describe('shared public tag aggregation', () => {
  it('preserves case-insensitive totals and the JSON endpoint station filter', () => {
    const video = {
      id: 'fixture',
      title: 'Fixture',
      duration: 1,
      date: '2026-10-26',
      tags: ['Space'],
    };
    const catalog: Catalog = {
      lastUpdated: '2026-10-26',
      stations: {
        science: { videos: [video, { ...video, tags: ['space'] }], categoryVideoIds: {} },
        other: { videos: [video], categoryVideoIds: {} },
      },
    };
    expect(tagSummaries(catalog)).toEqual([
      { tag: 'Space', total: 3, perStation: { science: 2, other: 1 } },
    ]);
    expect(tagSummaries(catalog, new Set(['science']))).toEqual([
      { tag: 'Space', total: 2, perStation: { science: 2 } },
    ]);
  });
});
