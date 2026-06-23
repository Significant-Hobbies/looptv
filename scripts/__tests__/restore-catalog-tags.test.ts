import { describe, expect, it } from 'vitest';
import {
  applyRestoredTags,
  buildTagIndex,
  deriveCategoryVideoIds,
  mergeTagIndexes,
  slugifyTag,
} from '../restore-catalog-tags.mjs';

describe('restore-catalog-tags', () => {
  it('merges tag indexes with first-ref precedence', () => {
    const a = buildTagIndex({
      stations: {
        science: {
          videos: [{ id: 'abc', tags: ['Veritasium', 'physics', 'gravity'] }],
        },
      },
    });
    const b = buildTagIndex({
      stations: {
        science: {
          videos: [
            { id: 'abc', tags: ['Veritasium', 'old tag'] },
            { id: 'xyz', tags: ['Veritasium', 'math'] },
          ],
        },
      },
    });

    const merged = mergeTagIndexes([a, b]);
    expect(merged.get('abc')).toEqual(['Veritasium', 'physics', 'gravity']);
    expect(merged.get('xyz')).toEqual(['Veritasium', 'math']);
  });

  it('restores tags only for placeholder entries and rebuilds categories', () => {
    const catalog = {
      stations: {
        science: {
          videos: [
            { id: 'abc', source: 'Veritasium', tags: ['Veritasium'] },
            { id: 'xyz', source: 'Veritasium', tags: ['Veritasium', 'existing'] },
          ],
          categoryVideoIds: {},
        },
      },
    };
    const tagIndex = new Map([
      ['abc', ['Veritasium', 'physics', 'gravity']],
      ['xyz', ['Veritasium', 'ignored']],
    ]);
    const sourceNames = new Map([['science', new Set(['Veritasium'])]]);

    const stats = applyRestoredTags(catalog, tagIndex, sourceNames);
    expect(stats).toEqual({ restored: 1, alreadyTagged: 1, stillUntagged: 0 });
    expect(catalog.stations.science.videos[0].tags).toContain('physics');
    expect(catalog.stations.science.categoryVideoIds).toEqual({});
  });

  it('slugifies category keys', () => {
    expect(slugifyTag('Black Jeopardy')).toBe('black_jeopardy');
  });

  it('derives categories from frequent non-source tags', () => {
    const videos = Array.from({ length: 20 }, (_, i) => ({
      id: `v${i}`,
      tags: i < 12 ? ['Channel', 'physics'] : ['Channel'],
      source: 'Channel',
    }));
    const categories = deriveCategoryVideoIds(videos, new Set(['Channel']));
    expect(categories.physics?.length).toBe(12);
  });
});
